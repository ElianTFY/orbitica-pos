import json
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query, Response, Header
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.sale import SaleCreate, SaleResponse, RefundRequest
from app.schemas.common import StandardResponse
from app.services.sale_service import SaleService
from app.services.idempotency_service import IdempotencyService
from app.services.hacienda_service import HaciendaService
from app.services.hacienda_xml_generator_v44 import generate_hacienda_xml_v44
from app.models.sale import Sale
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.security.deps import CurrentUserContext, require_permissions
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/sales", tags=["POS Sales"])

@router.post("", response_model=StandardResponse[SaleResponse], status_code=status.HTTP_201_CREATED)
async def create_sale(
    payload: SaleCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    context: CurrentUserContext = Depends(require_permissions("pos:sell")),
    db: AsyncSession = Depends(get_db)
):
    idempotency_svc = IdempotencyService(db, context.organization_id)
    if idempotency_key:
        req_hash = IdempotencyService.compute_request_hash(payload.model_dump(mode="json"))
        is_cached, cached_record = await idempotency_svc.start_or_get_idempotent_operation(
            operation="SALE_CREATE",
            idempotency_key=idempotency_key.strip(),
            request_hash=req_hash
        )
        if is_cached and cached_record and cached_record.response_payload:
            return JSONResponse(
                content=json.loads(cached_record.response_payload),
                status_code=cached_record.status_code,
                headers={"X-Cache-Lookup": "HIT"}
            )

    service = SaleService(db, context.organization_id)
    sale = await service.create_sale(
        data=payload,
        user_id=context.user_id,
    )
    resp_obj = StandardResponse(
        data=SaleResponse.model_validate(sale),
        message="Venta procesada exitosamente"
    )

    if idempotency_key:
        resp_json = resp_obj.model_dump_json()
        await idempotency_svc.complete_idempotent_operation(
            operation="SALE_CREATE",
            idempotency_key=idempotency_key.strip(),
            response_payload=resp_json,
            status_code=status.HTTP_201_CREATED
        )

    return resp_obj

@router.get("", response_model=StandardResponse[List[SaleResponse]])
async def list_sales(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    service = SaleService(db, context.organization_id)
    sales = await service.list_sales(limit=limit, offset=offset)
    return StandardResponse(data=[SaleResponse.model_validate(s) for s in sales])

@router.get("/{sale_id}", response_model=StandardResponse[SaleResponse])
async def get_sale(
    sale_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    service = SaleService(db, context.organization_id)
    sale = await service.get_sale(sale_id)
    return StandardResponse(data=SaleResponse.model_validate(sale))

@router.get("/{sale_id}/receipt", response_model=StandardResponse[Dict[str, Any]])
async def get_thermal_receipt(
    sale_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Sale).options(
        selectinload(Sale.items),
        selectinload(Sale.payments)
    ).where(Sale.id == sale_id, Sale.organization_id == context.organization_id)
    res = await db.execute(stmt)
    sale = res.scalar_one_or_none()
    if not sale:
        raise NotFoundException("Venta no encontrada")

    org_res = await db.execute(select(Organization).where(Organization.id == context.organization_id))
    org = org_res.scalar_one_or_none()

    branch_res = await db.execute(select(Branch).where(Branch.id == sale.branch_id))
    branch = branch_res.scalar_one_or_none()

    cust = None
    if sale.customer_id:
        cust_res = await db.execute(select(Customer).where(Customer.id == sale.customer_id))
        cust = cust_res.scalar_one_or_none()

    receipt_data = HaciendaService.generate_thermal_receipt_payload(
        sale=sale,
        org=org,
        branch=branch,
        customer=cust
    )
    return StandardResponse(data=receipt_data)

@router.get("/{sale_id}/xml")
async def get_hacienda_xml(
    sale_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Sale).options(
        selectinload(Sale.items),
        selectinload(Sale.payments)
    ).where(Sale.id == sale_id, Sale.organization_id == context.organization_id)
    res = await db.execute(stmt)
    sale = res.scalar_one_or_none()
    if not sale:
        raise NotFoundException("Venta no encontrada")

    org_res = await db.execute(select(Organization).where(Organization.id == context.organization_id))
    org = org_res.scalar_one_or_none()

    branch_res = await db.execute(select(Branch).where(Branch.id == sale.branch_id))
    branch = branch_res.scalar_one_or_none()

    cust = None
    if sale.customer_id:
        cust_res = await db.execute(select(Customer).where(Customer.id == sale.customer_id))
        cust = cust_res.scalar_one_or_none()

    doc_type = "01" if cust and cust.identification_number else "04"
    xml_content = generate_hacienda_xml_v44(
        sale=sale,
        org=org,
        branch=branch,
        customer=cust,
        doc_type=doc_type
    )
    return Response(content=xml_content, media_type="application/xml")

@router.post("/{sale_id}/refund", response_model=StandardResponse[SaleResponse])
async def refund_sale(
    sale_id: UUID,
    payload: RefundRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    context: CurrentUserContext = Depends(require_permissions("pos:refund")),
    db: AsyncSession = Depends(get_db)
):
    idempotency_svc = IdempotencyService(db, context.organization_id)
    if idempotency_key:
        req_hash = IdempotencyService.compute_request_hash(f"{sale_id}:{payload.model_dump_json()}")
        is_cached, cached_record = await idempotency_svc.start_or_get_idempotent_operation(
            operation="SALE_REFUND",
            idempotency_key=idempotency_key.strip(),
            request_hash=req_hash
        )
        if is_cached and cached_record and cached_record.response_payload:
            return JSONResponse(
                content=json.loads(cached_record.response_payload),
                status_code=cached_record.status_code,
                headers={"X-Cache-Lookup": "HIT"}
            )

    service = SaleService(db, context.organization_id)
    sale = await service.refund_sale(sale_id=sale_id, data=payload, actor_id=context.user_id)
    resp_obj = StandardResponse(
        data=SaleResponse.model_validate(sale),
        message="Venta reembolsada y stock reintegrado al inventario"
    )

    if idempotency_key:
        resp_json = resp_obj.model_dump_json()
        await idempotency_svc.complete_idempotent_operation(
            operation="SALE_REFUND",
            idempotency_key=idempotency_key.strip(),
            response_payload=resp_json,
            status_code=status.HTTP_200_OK
        )

    return resp_obj
