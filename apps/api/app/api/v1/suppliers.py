from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.schemas.common import StandardResponse
from app.services.supplier_service import SupplierService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=StandardResponse[List[SupplierResponse]])
async def list_suppliers(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    service = SupplierService(db, context.organization_id)
    suppliers = await service.list_suppliers(search=search, is_active=is_active, limit=limit, offset=offset)
    return StandardResponse(
        data=[SupplierResponse.model_validate(s) for s in suppliers]
    )

@router.get("/{supplier_id}", response_model=StandardResponse[SupplierResponse])
async def get_supplier(
    supplier_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    service = SupplierService(db, context.organization_id)
    supplier = await service.get_supplier(supplier_id)
    return StandardResponse(data=SupplierResponse.model_validate(supplier))

@router.post("", response_model=StandardResponse[SupplierResponse], status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    context: CurrentUserContext = Depends(require_permissions("inventory:adjust")),
    db: AsyncSession = Depends(get_db)
):
    service = SupplierService(db, context.organization_id)
    supplier = await service.create_supplier(payload, actor_id=context.user_id)
    return StandardResponse(
        data=SupplierResponse.model_validate(supplier),
        message="Proveedor registrado exitosamente"
    )

@router.patch("/{supplier_id}", response_model=StandardResponse[SupplierResponse])
async def update_supplier(
    supplier_id: UUID,
    payload: SupplierUpdate,
    context: CurrentUserContext = Depends(require_permissions("inventory:adjust")),
    db: AsyncSession = Depends(get_db)
):
    service = SupplierService(db, context.organization_id)
    supplier = await service.update_supplier(supplier_id, payload, actor_id=context.user_id)
    return StandardResponse(
        data=SupplierResponse.model_validate(supplier),
        message="Proveedor actualizado exitosamente"
    )
