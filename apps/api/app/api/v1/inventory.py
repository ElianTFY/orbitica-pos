from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.inventory import (
    InventoryAdjustmentCreate,
    InventoryTransferCreate,
    InventoryMovementResponse,
    LowStockItemResponse
)
from app.schemas.common import StandardResponse
from app.services.inventory_service import InventoryService
from app.services.catalog_service import CatalogService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post("/adjust", response_model=StandardResponse[dict], status_code=status.HTTP_200_OK)
async def adjust_stock(
    payload: InventoryAdjustmentCreate,
    context: CurrentUserContext = Depends(require_permissions("inventory:adjust")),
    db: AsyncSession = Depends(get_db)
):
    service = InventoryService(db, context.organization_id)
    stock = await service.adjust_stock(payload, actor_id=context.user_id)
    return StandardResponse(
        data={"product_id": stock.product_id, "branch_id": stock.branch_id, "new_quantity": stock.quantity},
        message="Ajuste de inventario aplicado correctamente"
    )

@router.post("/transfer", response_model=StandardResponse[dict], status_code=status.HTTP_200_OK)
async def transfer_stock(
    payload: InventoryTransferCreate,
    context: CurrentUserContext = Depends(require_permissions("inventory:transfer")),
    db: AsyncSession = Depends(get_db)
):
    service = InventoryService(db, context.organization_id)
    await service.transfer_stock(payload, actor_id=context.user_id)
    return StandardResponse(data={}, message="Traslado de inventario completado con éxito")

@router.get("/low-stock", response_model=StandardResponse[List[LowStockItemResponse]])
async def get_low_stock(
    branch_id: Optional[UUID] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = InventoryService(db, context.organization_id)
    alerts = await service.get_low_stock_alerts(branch_id=b_id)
    return StandardResponse(data=[LowStockItemResponse.model_validate(a) for a in alerts])

@router.get("/movements", response_model=StandardResponse[List[InventoryMovementResponse]])
async def list_movements(
    branch_id: Optional[UUID] = Query(None),
    product_id: Optional[UUID] = Query(None),
    movement_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    service = InventoryService(db, context.organization_id)
    movements = await service.list_movements(
        branch_id=branch_id,
        product_id=product_id,
        movement_type=movement_type,
        limit=limit,
        offset=offset
    )
    return StandardResponse(data=[InventoryMovementResponse.model_validate(m) for m in movements])

@router.get("/stock", response_model=StandardResponse[List[dict]])
async def get_branch_stock(
    branch_id: Optional[UUID] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("inventory:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    cat_service = CatalogService(db, context.organization_id)
    prods = await cat_service.list_products(branch_id=b_id)
    data = [{"product_id": str(p["id"]), "name": p["name"], "quantity": p["current_stock"]} for p in prods]
    return StandardResponse(data=data)
