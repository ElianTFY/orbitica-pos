from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.branch import Branch
from app.models.user import User
from app.schemas.subscription import SubscriptionResponse
from app.schemas.common import StandardResponse
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/subscription", tags=["SaaS Subscription"])

@router.get("", response_model=StandardResponse[SubscriptionResponse])
async def get_subscription_details(
    context: CurrentUserContext = Depends(require_permissions("org:read")),
    db: AsyncSession = Depends(get_db)
):
    # Count branches
    b_stmt = select(func.count(Branch.id)).where(
        Branch.organization_id == context.organization_id,
        Branch.is_active == True
    )
    b_res = await db.execute(b_stmt)
    b_count = b_res.scalar_one() or 1

    # Count users
    u_stmt = select(func.count(User.id)).where(
        User.organization_id == context.organization_id,
        User.is_active == True
    )
    u_res = await db.execute(u_stmt)
    u_count = u_res.scalar_one() or 1

    sub_data = SubscriptionResponse(
        plan_name="Plan Pro Empresarial",
        status="ACTIVE",
        branches_limit=5,
        branches_used=b_count,
        users_limit=15,
        users_used=u_count,
        currency="CRC",
        price_monthly=Decimal("25000.00"),
        features=[
            "Multisucursal hasta 5 puntos de venta",
            "Punto de Venta POS de alta velocidad",
            "Facturación Electrónica Hacienda Costa Rica v4.3 ilimitada",
            "Control de Cajas y Arqueos Ciegos",
            "Libro Mayor de Inventario Inmutable",
            "Reportes Financieros y Métricas en Tiempo Real",
            "Soporte Premium Orbítica Studio"
        ]
    )
    return StandardResponse(data=sub_data)
