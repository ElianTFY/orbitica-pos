from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.purchase import PurchaseCreate, PurchaseResponse
from app.schemas.common import StandardResponse
from app.services.purchase_service import PurchaseService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/purchases", tags=["Purchases & Stock Intake"])

@router.post("", response_model=StandardResponse[PurchaseResponse], status_code=status.HTTP_201_CREATED)
async def create_purchase(
    payload: PurchaseCreate,
    context: CurrentUserContext = Depends(require_permissions("inventory:adjust")),
    db: AsyncSession = Depends(get_db)
):
    service = PurchaseService(db, context.organization_id)
    purchase = await service.create_purchase(
        data=payload,
        user_id=context.user_id,
        default_branch_id=context.selected_branch_id
    )
    return StandardResponse(
        data=PurchaseResponse.model_validate(purchase),
        message="Compra registrada e inventario aumentado exitosamente"
    )
