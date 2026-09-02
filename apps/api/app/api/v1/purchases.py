from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.purchase import PurchaseCreate, PurchaseResponse
from app.schemas.common import StandardResponse
from app.services.purchase_service import PurchaseService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/purchases", tags=["Purchases & Stock Intake"])

@router.get("", response_model=StandardResponse[List[PurchaseResponse]])
async def list_purchases(
    branch_id: Optional[UUID] = Query(None),
    supplier_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = PurchaseService(db, context.organization_id)
    purchases = await service.list_purchases(branch_id=b_id, supplier_id=supplier_id, limit=limit, offset=offset)
    return StandardResponse(
        data=[PurchaseResponse.model_validate(p) for p in purchases]
    )

@router.get("/{purchase_id}", response_model=StandardResponse[PurchaseResponse])
async def get_purchase(
    purchase_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    service = PurchaseService(db, context.organization_id)
    purchase = await service.get_purchase(purchase_id)
    return StandardResponse(data=PurchaseResponse.model_validate(purchase))

@router.post("", response_model=StandardResponse[PurchaseResponse], status_code=status.HTTP_201_CREATED)
async def create_purchase(
    payload: PurchaseCreate,
    context: CurrentUserContext = Depends(require_permissions("inventory:adjust")),
    db: AsyncSession = Depends(get_db)
):
    if not payload.branch_id and context.selected_branch_id:
        payload.branch_id = context.selected_branch_id

    service = PurchaseService(db, context.organization_id)
    purchase = await service.create_purchase(
        data=payload,
        user_id=context.user_id
    )
    return StandardResponse(
        data=PurchaseResponse.model_validate(purchase),
        message="Compra registrada e inventario aumentado exitosamente"
    )
