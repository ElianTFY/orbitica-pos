import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))
import asyncio
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
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
    print("Connecting to database:", settings.DATABASE_URL)
    connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
    engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with async_session() as session:
        # 1. Superadmin User
        superadmin = User(
            email="superadmin@orbitica.cr",
            password_hash=hash_password("SuperSecret123!"),
            full_name="Superadministrador Orbítica",
            phone="+506 2200-0000",
            role=UserRole.SUPERADMIN,
            organization_id=None
        )
        session.add(superadmin)

        # 2. Demo Organization
        org = Organization(
            legal_name="Comercial San José S.A.",
            trade_name="Minimarket San José Express",
            identification_type="JURIDICA",
            identification_number="3101888999",
            email="contacto@sanjoseexpress.cr",
            phone="+506 2222-3333",
            country_code="CR",
            default_currency="CRC"
        )
        session.add(org)
        await session.flush()

        # 3. Branches
        b_central = Branch(
            organization_id=org.id,
            code="001",
            name="Sucursal Central - San José",
            address="Avenida Central, Calle 3, San José, Costa Rica",
            phone="+506 2222-3333",
            is_main=True
        )
        b_escazu = Branch(
            organization_id=org.id,
            code="002",
            name="Sucursal Escazú",
            address="Plaza Roble, Escazú, San José",
            phone="+506 2228-4444",
            is_main=False
        )
        session.add_all([b_central, b_escazu])
        await session.flush()

        # 4. Cash Registers
        cr1 = CashRegister(branch_id=b_central.id, name="Caja Principal 01", pos_terminal_number="00001")
        cr2 = CashRegister(branch_id=b_escazu.id, name="Caja Escazú 01", pos_terminal_number="00001")
        session.add_all([cr1, cr2])

        # 5. Users
        owner = User(
            organization_id=org.id,
            email="owner@sanjoseexpress.cr",
            password_hash=hash_password("OwnerPassword123!"),
            full_name="Alejandro Morales (Owner)",
            phone="+506 8888-1111",
            role=UserRole.OWNER
        )
        manager = User(
            organization_id=org.id,
            email="gerente@sanjoseexpress.cr",
            password_hash=hash_password("ManagerPassword123!"),
            full_name="Sofía Castro (Gerente)",
            phone="+506 8888-2222",
            role=UserRole.MANAGER
        )
        cashier = User(
            organization_id=org.id,
            email="cajero@sanjoseexpress.cr",
            password_hash=hash_password("CashierPassword123!"),
            full_name="Kevin Vargas (Cajero)",
            phone="+506 8888-3333",
            role=UserRole.CASHIER
        )
        session.add_all([owner, manager, cashier])
        await session.flush()

        # Branch Access
        session.add_all([
            UserBranchAccess(user_id=owner.id, branch_id=b_central.id, is_default=True),
            UserBranchAccess(user_id=owner.id, branch_id=b_escazu.id, is_default=False),
            UserBranchAccess(user_id=manager.id, branch_id=b_central.id, is_default=True),
            UserBranchAccess(user_id=cashier.id, branch_id=b_central.id, is_default=True),
        ])

        # 6. Costa Rica Tax Rates
        tax_13 = TaxRate(organization_id=org.id, name="IVA General 13%", code_cr="01", rate=Decimal("13.00"), is_default=True)
        tax_4 = TaxRate(organization_id=org.id, name="IVA Reducido 4%", code_cr="02", rate=Decimal("4.00"), is_default=False)
        tax_2 = TaxRate(organization_id=org.id, name="IVA Reducido 2%", code_cr="03", rate=Decimal("2.00"), is_default=False)
        tax_1 = TaxRate(organization_id=org.id, name="IVA Canasta Básica 1%", code_cr="04", rate=Decimal("1.00"), is_default=False)
        tax_0 = TaxRate(organization_id=org.id, name="Exento 0%", code_cr="05", rate=Decimal("0.00"), is_default=False)
        session.add_all([tax_13, tax_4, tax_2, tax_1, tax_0])
        await session.flush()

        # 7. Categories
        cat_bebidas = Category(organization_id=org.id, name="Bebidas & Refrescos", description="Gaseosas, jugos, agua")
        cat_snacks = Category(organization_id=org.id, name="Snacks & Galletas", description="Papas, galletas, confites")
        cat_licores = Category(organization_id=org.id, name="Licores & Cervezas", description="Cerveza nacional e importada")
        cat_abarrotes = Category(organization_id=org.id, name="Abarrotes", description="Arroz, frijoles, aceite, café")
        session.add_all([cat_bebidas, cat_snacks, cat_licores, cat_abarrotes])
        await session.flush()

        # 8. Sample Products
        products = [
            Product(
                organization_id=org.id,
                category_id=cat_bebidas.id,
                tax_rate_id=tax_13.id,
                name="Coca-Cola 600ml Descartable",
                sku="BEB-001",
                barcode="7441001001",
                cost_price=Decimal("800.00"),
                sale_price=Decimal("1200.00"),
                min_stock_alert=Decimal("10.00")
            ),
            Product(
                organization_id=org.id,
                category_id=cat_licores.id,
                tax_rate_id=tax_13.id,
                name="Cerveza Imperial 350ml Lata",
                sku="LIC-001",
                barcode="7441002002",
                cost_price=Decimal("950.00"),
                sale_price=Decimal("1400.00"),
                min_stock_alert=Decimal("24.00")
            ),
            Product(
                organization_id=org.id,
                category_id=cat_snacks.id,
                tax_rate_id=tax_13.id,
                name="Papas Tosty Clásicas 115g",
                sku="SNK-001",
                barcode="7441003003",
                cost_price=Decimal("550.00"),
                sale_price=Decimal("850.00"),
                min_stock_alert=Decimal("15.00")
            ),
            Product(
                organization_id=org.id,
                category_id=cat_abarrotes.id,
                tax_rate_id=tax_1.id,  # Canasta básica 1%
                name="Café Rey 500g Tradicional",
                sku="ABA-001",
                barcode="7441004004",
                cost_price=Decimal("2100.00"),
                sale_price=Decimal("2800.00"),
                min_stock_alert=Decimal("8.00")
            )
        ]
        session.add_all(products)
        await session.flush()

        # Stock for each product
        for p in products:
            session.add(BranchProductStock(branch_id=b_central.id, product_id=p.id, quantity=Decimal("50.00")))
            session.add(BranchProductStock(branch_id=b_escazu.id, product_id=p.id, quantity=Decimal("25.00")))

        # 9. Sample Customer
        customer = Customer(
            organization_id=org.id,
            name="Juan Pérez Gómez",
            identification_type="FISICA",
            identification_number="112340567",
            email="juan.perez@email.cr",
            phone="+506 8765-4321",
            address="San José, Costa Rica"
        )
        session.add(customer)

        await session.commit()
        print("Database seeded successfully with Orbítica Demo Tenant!")

if __name__ == "__main__":
    import sys
    asyncio.run(seed())
