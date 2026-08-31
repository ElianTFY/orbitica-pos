import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))
import asyncio
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.db.base import Base
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.models.user import User
from app.models.catalog import Category, TaxRate, Product, BranchProductStock
from app.models.customer import Customer
from app.models.cash_register import CashRegister, CashRegisterSession
from app.security.password import hash_password
from app.core.constants import UserRole

async def seed():
    load_demo = os.getenv("LOAD_DEMO_DATA", "false").lower() in ("true", "1")
    print(f"Connecting to database: {settings.DATABASE_URL} (LOAD_DEMO_DATA={load_demo})")

    connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
    engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with async_session() as session:
        # 1. Superadmin User (Platform operator only)
        stmt = select(User).where(User.email == "superadmin@orbitica.cr")
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            superadmin = User(
                email="superadmin@orbitica.cr",
                password_hash=hash_password("SuperSecret123!"),
                full_name="Superadministrador Orbítica",
                phone="+506 2200-0000",
                role=UserRole.SUPERADMIN,
                organization_id=None
            )
            session.add(superadmin)
            await session.flush()
            print("✓ Superadmin platform user verified.")

        # 2. Only seed demo organization if explicitly requested for development
        if not load_demo:
            await session.commit()
            print("✓ Production/Clean mode: No demo tenants or mock data loaded. Ready for real clients.")
            return

        print("! Loading isolated development demo tenant...")
        demo_stmt = select(Organization).where(Organization.identification_number == "3101888999")
        demo_res = await session.execute(demo_stmt)
        if demo_res.scalar_one_or_none():
            print("! Demo tenant already exists, skipping.")
            await session.commit()
            return

        org = Organization(
            legal_name="Comercial San José S.A.",
            trade_name="Minimarket San José Express (DEMO)",
            identification_type="JURIDICA",
            identification_number="3101888999",
            email="contacto@sanjoseexpress.cr",
            phone="+506 2222-3333",
            country_code="CR",
            default_currency="CRC"
        )
        session.add(org)
        await session.flush()

        b_central = Branch(
            organization_id=org.id,
            code="001",
            name="Sucursal Central (DEMO)",
            address="Avenida Central, San José, Costa Rica",
            phone="+506 2222-3333",
            is_main=True
        )
        session.add(b_central)
        await session.flush()

        tax_13 = TaxRate(organization_id=org.id, name="IVA General 13%", code_cr="01", rate=Decimal("13.00"), is_default=True)
        session.add(tax_13)
        await session.flush()

        owner = User(
            organization_id=org.id,
            email="owner@sanjoseexpress.cr",
            password_hash=hash_password("OwnerPassword123!"),
            full_name="Alejandro Morales (Demo Owner)",
            phone="+506 8888-1111",
            role=UserRole.OWNER
        )
        session.add(owner)
        await session.flush()

        session.add(UserBranchAccess(user_id=owner.id, branch_id=b_central.id, is_default=True))
        await session.commit()
        print("✓ Demo tenant seeded in isolated namespace.")

if __name__ == "__main__":
    asyncio.run(seed())