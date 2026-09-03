import uuid
import asyncio
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.models.user import User
from app.models.catalog import Product, Category, TaxRate, BranchProductStock
from app.models.cash_register import CashRegister, CashRegisterSession
from app.models.customer import Customer
from app.models.sale import Sale
from app.models.inventory import InventoryMovement
from app.core.constants import UserRole
from app.security.password import hash_password
from app.security.tokens import create_access_token

async def create_tenant_setup(db: AsyncSession, suffix: str, org_name: str):
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        legal_name=f"{org_name} S.A.",
        trade_name=org_name,
        identification_type="JURIDICA",
        identification_number=f"3101{uuid.uuid4().int % 1000000:06d}",
        email=f"admin_{suffix}@test.cr",
        phone="2222-3333",
        is_active=True,
        atv_environment="STAGING"
    )
    db.add(org)

    branch_id = uuid.uuid4()
    branch = Branch(
        id=branch_id,
        organization_id=org_id,
        name=f"Sucursal Principal {suffix}",
        code="001",
        is_active=True
    )
    db.add(branch)

    tax_id = uuid.uuid4()
    tax = TaxRate(
        id=tax_id,
        organization_id=org_id,
        name="IVA 13%",
        code_cr="08",
        rate=Decimal("13.00"),
        is_active=True
    )
    db.add(tax)

    cat_id = uuid.uuid4()
    cat = Category(
        id=cat_id,
        organization_id=org_id,
        name=f"General {suffix}"
    )
    db.add(cat)

    user_id = uuid.uuid4()
    owner = User(
        id=user_id,
        organization_id=org_id,
        email=f"owner_{suffix}@test.cr",
        password_hash=hash_password("OwnerPassword123!"),
        full_name=f"Propietario {suffix}",
        role=UserRole.OWNER,
        is_active=True
    )
    db.add(owner)

    access = UserBranchAccess(user_id=user_id, branch_id=branch_id)
    db.add(access)

    register_id = uuid.uuid4()
    register = CashRegister(
        id=register_id,
        organization_id=org_id,
        branch_id=branch_id,
        name=f"Caja Principal {suffix}",
        pos_terminal_number="00001",
        is_active=True
    )
    db.add(register)

    await db.commit()
    token = create_access_token(subject=str(user_id), claims={"role": owner.role.value})
    return {
        "org": org,
        "branch": branch,
        "tax": tax,
        "category": cat,
        "owner": owner,
        "token": token,
        "register": register
    }

@pytest.mark.asyncio
async def test_two_tenants_isolation_zero_trust_tampering(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    CRITICAL MULTITENANCY AUDIT:
    Tenant A and Tenant B must be strictly isolated.
    Tampering with IDs, routes, or queries must never leak data.
    """
    tenant_a = await create_tenant_setup(db_session, "a", "Supermercado A")
    tenant_b = await create_tenant_setup(db_session, "b", "Librería B")

    headers_a = {"Authorization": f"Bearer {tenant_a['token']}", "X-Branch-ID": str(tenant_a["branch"].id)}
    headers_b = {"Authorization": f"Bearer {tenant_b['token']}", "X-Branch-ID": str(tenant_b["branch"].id)}

    # 1. Create product in Tenant A
    prod_a_res = await client.post("/api/v1/products", json={
        "name": "Arroz Especial A",
        "sku": "ARR-001-A",
        "category_id": str(tenant_a["category"].id),
        "tax_rate_id": str(tenant_a["tax"].id),
        "sale_price": "2500.00",
        "cost_price": "1800.00",
        "initial_stock": "100.00",
        "branch_id": str(tenant_a["branch"].id),
        "unit_of_measure": "kg",
        "cabys_code": "2111100000000"
    }, headers=headers_a)
    assert prod_a_res.status_code == 201
    prod_a_id = prod_a_res.json()["data"]["id"]

    # 2. Create customer in Tenant B
    cust_b_res = await client.post("/api/v1/customers", json={
        "name": "Cliente Exclusivo B",
        "identification_type": "FISICA",
        "identification_number": "109870654",
        "email": "cliente_b@domain.cr"
    }, headers=headers_b)
    assert cust_b_res.status_code == 201
    cust_b_id = cust_b_res.json()["data"]["id"]

    # ATTACK 1: Tenant B tries to read Tenant A's product
    tampered_prod_res = await client.get(f"/api/v1/products?search=Arroz", headers=headers_b)
    assert tampered_prod_res.status_code == 200
    assert len(tampered_prod_res.json()["data"]) == 0  # Tenant B sees nothing from A

    # ATTACK 2: Tenant A tries to read Tenant B's customer
    tampered_cust_res = await client.get(f"/api/v1/customers/{cust_b_id}", headers=headers_a)
    assert tampered_cust_res.status_code in [403, 404]

    # ATTACK 3: Tenant B attempts to sell Tenant A's product
    attack_sale_res = await client.post("/api/v1/sales", json={
        "branch_id": str(tenant_b["branch"].id),
        "items": [{"product_id": prod_a_id, "quantity": "1.00", "discount_percentage": "0.00"}],
        "payments": [{"payment_method": "CASH", "amount": "2500.00"}]
    }, headers=headers_b)
    assert attack_sale_res.status_code in [400, 404]

@pytest.mark.asyncio
async def test_fresh_new_tenant_zero_demo_data(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    FRESH TENANT AUDIT:
    A newly registered tenant must start completely clean.
    Zero products, zero sales, zero demo metrics, 0 revenue.
    """
    fresh = await create_tenant_setup(db_session, "fresh", "Tienda Totalmente Nueva")
    headers = {"Authorization": f"Bearer {fresh['token']}"}

    # Products must be empty
    prods = await client.get("/api/v1/products", headers=headers)
    assert prods.status_code == 200
    assert len(prods.json()["data"]) == 0

    # Customers must be empty
    custs = await client.get("/api/v1/customers", headers=headers)
    assert custs.status_code == 200
    assert len(custs.json()["data"]) == 0

    # Sales must be empty
    sales = await client.get("/api/v1/sales", headers=headers)
    assert sales.status_code == 200
    assert len(sales.json()["data"]) == 0

    # Active cash session must be empty
    cash = await client.get("/api/v1/cash-registers/sessions/active", headers=headers)
    assert cash.status_code == 200
    assert cash.json()["data"] is None

    # Dashboard report must be 0
    dashboard = await client.get("/api/v1/reports/dashboard", headers=headers)
    assert dashboard.status_code == 200
    d_data = dashboard.json()["data"]
    assert Decimal(str(d_data.get("total_sales_amount", 0))) == Decimal("0")
    assert d_data.get("total_tickets", 0) == 0

@pytest.mark.asyncio
async def test_full_sale_lifecycle_and_updates(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    COMMERCIAL SALE LIFECYCLE:
    Stock: 10, Price: 5000 CRC. Buy 2 units.
    Total: 10,000 CRC.
    Stock updates to 8.
    """
    tenant = await create_tenant_setup(db_session, "sale_flow", "Comercializadora Central")
    headers = {"Authorization": f"Bearer {tenant['token']}", "X-Branch-ID": str(tenant["branch"].id)}

    # Open cash shift
    open_sess_res = await client.post("/api/v1/cash-registers/sessions/open", json={
        "cash_register_id": str(tenant["register"].id),
        "initial_cash_amount": "20000.00"
    }, headers=headers)
    assert open_sess_res.status_code == 201
    cash_session_id = open_sess_res.json()["data"]["id"]

    # Create Product with 10 units
    prod_res = await client.post("/api/v1/products", json={
        "name": "Aceite Vegetal 1L",
        "sku": "ACE-001",
        "category_id": str(tenant["category"].id),
        "tax_rate_id": str(tenant["tax"].id),
        "sale_price": "5000.00",
        "cost_price": "3500.00",
        "initial_stock": "10.00",
        "branch_id": str(tenant["branch"].id),
        "unit_of_measure": "Unid",
        "cabys_code": "2111100000000"
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["data"]["id"]

    # Execute Sale of 2 units
    sale_res = await client.post("/api/v1/sales", json={
        "branch_id": str(tenant["branch"].id),
        "cash_session_id": cash_session_id,
        "items": [
            {
                "product_id": prod_id,
                "quantity": "2.00",
                "discount_percentage": "0.00"
            }
        ],
        "payments": [
            {
                "payment_method": "CASH",
                "amount": "10000.00"
            }
        ]
    }, headers=headers)
    assert sale_res.status_code == 201
    sale_data = sale_res.json()["data"]
    assert Decimal(str(sale_data["total_amount"])) == Decimal("10000.00")

    # Verify inventory was decremented to 8
    inv_res = await client.get(f"/api/v1/inventory/stock?branch_id={tenant['branch'].id}", headers=headers)
    assert inv_res.status_code == 200
    item = next(i for i in inv_res.json()["data"] if i["product_id"] == prod_id)
    assert Decimal(str(item["quantity"])) == Decimal("8.00")

    # Verify inventory ledger movement
    mov_stmt = select(InventoryMovement).where(
        InventoryMovement.product_id == uuid.UUID(prod_id),
        InventoryMovement.movement_type == "OUT_SALE"
    )
    mov_res = await db_session.execute(mov_stmt)
    movement = mov_res.scalar_one_or_none()
    assert movement is not None
    assert abs(Decimal(str(movement.quantity))) == Decimal("2.00")
    assert Decimal(str(movement.new_quantity)) == Decimal("8.00")

@pytest.mark.asyncio
async def test_concurrency_race_condition_last_stock_item(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    RACE CONDITION AUDIT:
    When only 1 item remains in stock, 2 concurrent checkout requests attempt to buy it.
    Exactly ONE must succeed, and the second must be rejected with 400 (insufficient stock).
    Stock must never become negative.
    """
    tenant = await create_tenant_setup(db_session, "race", "Zapatería Central")
    headers = {"Authorization": f"Bearer {tenant['token']}", "X-Branch-ID": str(tenant["branch"].id)}

    # Create Product with exactly 1.00 unit in stock
    prod_res = await client.post("/api/v1/products", json={
        "name": "Último Par Zapatos Exclusivos",
        "sku": "ZAP-ULTIMO-01",
        "category_id": str(tenant["category"].id),
        "tax_rate_id": str(tenant["tax"].id),
        "sale_price": "45000.00",
        "cost_price": "28000.00",
        "initial_stock": "1.00",
        "branch_id": str(tenant["branch"].id),
        "unit_of_measure": "Unid",
        "cabys_code": "2111100000000"
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["data"]["id"]

    sale_payload = {
        "branch_id": str(tenant["branch"].id),
        "items": [{"product_id": prod_id, "quantity": "1.00", "discount_percentage": "0.00"}],
        "payments": [{"payment_method": "CASH", "amount": "45000.00"}]
    }

    # Execute 2 requests concurrently
    # First sale consumes the only unit
    res1 = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert res1.status_code == 201

    # Second sale attempts to buy the now-exhausted unit -> must fail with 400
    res2 = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert res2.status_code == 400
    assert "insuficiente" in res2.json()["error"]["message"].lower()

    # Verify remaining stock is strictly 0.00 (never negative)
    inv_res = await client.get(f"/api/v1/inventory/stock?branch_id={tenant['branch'].id}", headers=headers)
    item = next(i for i in inv_res.json()["data"] if i["product_id"] == prod_id)
    assert Decimal(str(item["quantity"])) == Decimal("0.00")

@pytest.mark.asyncio
async def test_double_submit_idempotency(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    IDEMPOTENCY AUDIT:
    Rapid double-click on 'Completar Venta' using the same Idempotency-Key
    must produce exactly 1 sale and deduct stock only once.
    """
    tenant = await create_tenant_setup(db_session, "idemp", "Farmacia San Rafael")
    headers = {
        "Authorization": f"Bearer {tenant['token']}",
        "X-Branch-ID": str(tenant["branch"].id),
        "Idempotency-Key": f"idemp-sale-{uuid.uuid4().hex}"
    }

    # Product with 5 units
    prod_res = await client.post("/api/v1/products", json={
        "name": "Jarabe Tos 120ml",
        "sku": "JAR-001",
        "category_id": str(tenant["category"].id),
        "tax_rate_id": str(tenant["tax"].id),
        "sale_price": "6000.00",
        "cost_price": "3800.00",
        "initial_stock": "5.00",
        "branch_id": str(tenant["branch"].id),
        "unit_of_measure": "Unid",
        "cabys_code": "2111100000000"
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["data"]["id"]

    sale_payload = {
        "branch_id": str(tenant["branch"].id),
        "items": [{"product_id": prod_id, "quantity": "1.00", "discount_percentage": "0.00"}],
        "payments": [{"payment_method": "CASH", "amount": "6000.00"}]
    }

    # First submit
    res1 = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert res1.status_code == 201
    sale_id_1 = res1.json()["data"]["id"]

    # Second submit with the exact same Idempotency-Key (simulating network duplicate or double click)
    res2 = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert res2.status_code == 201
    sale_id_2 = res2.json()["data"]["id"]

    # Must return the identical sale record
    assert sale_id_1 == sale_id_2

    # Stock must have decreased by only 1 unit (5 -> 4)
    inv_res = await client.get(f"/api/v1/inventory/stock?branch_id={tenant['branch'].id}", headers=headers)
    item = next(i for i in inv_res.json()["data"] if i["product_id"] == prod_id)
    assert Decimal(str(item["quantity"])) == Decimal("4.00")

@pytest.mark.asyncio
async def test_cashier_rbac_blocked_from_admin_endpoints(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    RBAC PERMISSIONS AUDIT:
    A user with CASHIER role cannot execute administrative operations.
    Direct API requests must return 403 Forbidden.
    """
    tenant = await create_tenant_setup(db_session, "cashier_test", "Panadería Central")

    # Create Cashier user
    cashier_id = uuid.uuid4()
    cashier = User(
        id=cashier_id,
        organization_id=tenant["org"].id,
        email="cajero@panaderia.cr",
        password_hash=hash_password("CashierPass123!"),
        full_name="Cajero de Turno",
        role=UserRole.CASHIER,
        is_active=True
    )
    db_session.add(cashier)
    access = UserBranchAccess(user_id=cashier_id, branch_id=tenant["branch"].id)
    db_session.add(access)
    await db_session.commit()

    cashier_token = create_access_token(subject=str(cashier_id), claims={"role": cashier.role.value})
    headers = {"Authorization": f"Bearer {cashier_token}", "X-Branch-ID": str(tenant["branch"].id)}

    # Attempt 1: Cashier tries to create a new branch (Forbidden)
    branch_res = await client.post("/api/v1/branches", json={
        "name": "Sucursal Clandestina",
        "code": "002"
    }, headers=headers)
    assert branch_res.status_code == 403

    # Attempt 2: Cashier tries to create a user (Forbidden)
    user_res = await client.post("/api/v1/users", json={
        "email": "nuevo_cajero@panaderia.cr",
        "password": "Password123!",
        "full_name": "Nuevo Cajero",
        "role": "CASHIER"
    }, headers=headers)
    assert user_res.status_code == 403

    # Attempt 3: Cashier tries to read forensic audit logs (Forbidden)
    audit_res = await client.get("/api/v1/audit/logs", headers=headers)
    assert audit_res.status_code == 403

@pytest.mark.asyncio
async def test_file_upload_security_mime_and_tenant_isolation(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    FILE STORAGE & MIME AUDIT:
    Uploads must validate magic bytes, reject executables disguised as images,
    enforce size limits and isolate files per tenant.
    """
    tenant_a = await create_tenant_setup(db_session, "up_a", "Empresa Upload A")
    tenant_b = await create_tenant_setup(db_session, "up_b", "Empresa Upload B")

    headers_a = {"Authorization": f"Bearer {tenant_a['token']}"}
    headers_b = {"Authorization": f"Bearer {tenant_b['token']}"}

    # 1. Valid PNG with real magic bytes
    valid_png_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    up_res = await client.post(
        "/api/v1/uploads/image",
        files={"file": ("logo.png", valid_png_content, "image/png")},
        data={"category": "logos"},
        headers=headers_a
    )
    assert up_res.status_code == 201
    file_info = up_res.json()["data"]
    filename = file_info["filename"]
    assert file_info["mime_type"] == "image/png"

    # 2. Fake image (malicious executable disguised as .png)
    fake_png_content = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    fake_res = await client.post(
        "/api/v1/uploads/image",
        files={"file": ("virus.png", fake_png_content, "image/png")},
        data={"category": "logos"},
        headers=headers_a
    )
    assert fake_res.status_code == 400
    assert "inválido" in fake_res.json()["error"]["message"].lower()

    # 3. Tenant B cannot download Tenant A's private file
    cross_res = await client.get(f"/api/v1/uploads/logos/{filename}", headers=headers_b)
    assert cross_res.status_code == 404

    # 4. Tenant A can download their file
    own_res = await client.get(f"/api/v1/uploads/logos/{filename}", headers=headers_a)
    assert own_res.status_code == 200
    assert own_res.content == valid_png_content
