from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.purchase import SupplierCreate, SupplierResponse
from app.schemas.common import StandardResponse
from app.services.purchase_service import PurchaseService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=StandardResponse[List[SupplierResponse]])
async def list_suppliers(
    search: Optional[str] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    service = PurchaseService(db, context.organization_id)
    suppliers = await service.list_suppliers(search=search)
    return StandardResponse(
        data=[
            SupplierResponse(
                id=s.id,
                organization_id=s.organization_id,
                name=s.name,
                legal_id=s.identification_number or "",
                legal_id_type=s.identification_type,
                email=s.email,
                phone=s.phone,
                address=s.address,
                contact_person=s.notes,
                is_active=s.is_active
            )
            for s in suppliers
        ]
    )

@router.post("", response_model=StandardResponse[SupplierResponse], status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    context: CurrentUserContext = Depends(require_permissions("inventory:adjust")),
    db: AsyncSession = Depends(get_db)
):
    service = PurchaseService(db, context.organization_id)
    supp = await service.create_supplier(payload)
    return StandardResponse(
        data=SupplierResponse(
            id=supp.id,
            organization_id=supp.organization_id,
            name=supp.name,
            legal_id=supp.identification_number or "",
            legal_id_type=supp.identification_type,
            email=supp.email,
            phone=supp.phone,
            address=supp.address,
            contact_person=supp.notes,
            is_active=supp.is_active
        ),
        message="Proveedor registrado exitosamente"
    )
