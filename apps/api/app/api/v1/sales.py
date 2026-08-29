from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.sale import SaleCreate, SaleResponse, RefundRequest
from app.schemas.common import StandardResponse
from app.services.sale_service import SaleService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.post("", response_model=StandardResponse[SaleResponse], status_code=status.HTTP_201_CREATED)
async def create_sale(
    payload: SaleCreate,
    context: CurrentUserContext = Depends(require_permissions("pos:sell")),
    db: AsyncSession = Depends(get_db)
):
    service = SaleService(db, context.organization_id)
    sale = await service.create_sale(payload, user_id=context.user_id)
    return StandardResponse(
        data=SaleResponse.model_validate(sale),
        message=f"Venta #{sale.sale_number} completada con éxito"
    )

@router.get("", response_model=StandardResponse[List[SaleResponse]])
async def list_sales(
    branch_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = SaleService(db, context.organization_id)
    sales = await service.list_sales(branch_id=b_id, limit=limit, offset=offset)
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

@router.post("/{sale_id}/refund", response_model=StandardResponse[SaleResponse])
async def refund_sale(
    sale_id: UUID,
    payload: RefundRequest,
    context: CurrentUserContext = Depends(require_permissions("pos:refund")),
    db: AsyncSession = Depends(get_db)
):
    service = SaleService(db, context.organization_id)
    sale = await service.refund_sale(sale_id, payload, actor_id=context.user_id)
    return StandardResponse(
        data=SaleResponse.model_validate(sale),
        message=f"Venta #{sale.sale_number} devuelta e inventario reintegrado"
    )
