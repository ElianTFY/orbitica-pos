from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.branch import Branch
from app.models.user import User
from app.models.subscription import Subscription
from app.schemas.subscription import SubscriptionResponse
from app.schemas.common import StandardResponse
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/subscription", tags=["SaaS Subscription"])

async def _fetch_subscription(context: CurrentUserContext, db: AsyncSession) -> SubscriptionResponse:
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

    # Fetch persistent subscription
    sub_stmt = select(Subscription).where(Subscription.organization_id == context.organization_id)
    sub_res = await db.execute(sub_stmt)
    sub = sub_res.scalar_one_or_none()

    if not sub:
        now = datetime.now(timezone.utc)
        sub = Subscription(
            organization_id=context.organization_id,
            plan_id="TRIAL",
            status="ACTIVE",
            trial_ends_at=now + timedelta(days=14),
            current_period_start=now,
            current_period_end=now + timedelta(days=14),
            branches_limit=1,
            users_limit=3,
            price_monthly=Decimal("0.00"),
            currency=context.organization.default_currency if context.organization else "CRC",
            is_active=True
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)

    plan_names = {
        "TRIAL": "Plan Pro Empresarial",
        "STARTER": "Plan Emprendedor",
        "GROWTH": "Plan Negocio Pro",
        "SCALE": "Plan Empresarial Ilimitado"
    }

    return SubscriptionResponse(
        plan_name=plan_names.get(sub.plan_id, "Plan Pro Comercial"),
        status=sub.status,
        branches_limit=sub.branches_limit,
        branches_used=b_count,
        users_limit=sub.users_limit,
        users_used=u_count,
        currency=sub.currency,
        price_monthly=sub.price_monthly,
        features=[
            "Multisucursal hasta límite de plan",
            "Punto de Venta POS de alta velocidad",
            "Facturación Electrónica Hacienda Costa Rica v4.4 ilimitada",
            "Control de Cajas y Arqueos Ciegos",
            "Libro Mayor de Inventario Inmutable",
            "Reportes Financieros y Métricas en Tiempo Real",
            "Soporte Premium Orbítica Studio"
        ]
    )

@router.get("", response_model=StandardResponse[SubscriptionResponse])
async def get_subscription_details(
    context: CurrentUserContext = Depends(require_permissions("org:read")),
    db: AsyncSession = Depends(get_db)
):
    sub_data = await _fetch_subscription(context, db)
    return StandardResponse(data=sub_data)

@router.get("/current", response_model=StandardResponse[SubscriptionResponse])
async def get_subscription_current(
    context: CurrentUserContext = Depends(require_permissions("org:read")),
    db: AsyncSession = Depends(get_db)
):
    sub_data = await _fetch_subscription(context, db)
    return StandardResponse(data=sub_data)
