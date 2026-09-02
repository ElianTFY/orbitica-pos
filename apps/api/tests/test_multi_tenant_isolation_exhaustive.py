import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.catalog import TaxRate, Category, Product, BranchProductStock
from app.models.user import User
from app.security.password import hash_password
from app.core.constants import UserRole

@pytest.mark.asyncio
async def test_multi_tenant_isolation_exhaustive_negative_cases(
    client: AsyncClient,
    db_session: AsyncSession
):
    # -------------------------------------------------------------------------
    # Setup Organization A (Panadería La Espiga)
    # -------------------------------------------------------------------------
    org_a = Organization(
        legal_name="Panadería La Espiga S.A.",
        trade_name="La Espiga",
        identification_type="02",
        identification_number=f"3101{uuid.uuid4().hex[:6]}",
        email="owner_a@laespiga.cr"
    )
    db_session.add(org_a)
    await db_session.flush()

    branch_a = Branch(organization_id=org_a.id, code="001", name="Sucursal Central Espiga", is_main=True)
    db_session.add(branch_a)
    await db_session.flush()

    user_a = User(
        email="owner_a@laespiga.cr",
        password_hash=hash_password("EspigaPass123!"),
        full_name="Propietario Espiga",
        role=UserRole.OWNER,
        organization_id=org_a.id
    )
    db_session.add(user_a)

    tax_a = TaxRate(organization_id=org_a.id, name="IVA 13%", code_cr="01", rate=Decimal("13.00"))
    db_session.add(tax_a)
    cat_a = Category(organization_id=org_a.id, name="Panes")
    db_session.add(cat_a)
    await db_session.flush()

    prod_a = Product(
        organization_id=org_a.id,
        category_id=cat_a.id,
        tax_rate_id=tax_a.id,
        sku="PAN-ESP-01",
        name="Baguette Espiga",
        sale_price=Decimal("800.00"),
        cost_price=Decimal("400.00")
    )
    db_session.add(prod_a)
    await db_session.flush()
    db_session.add(BranchProductStock(branch_id=branch_a.id, product_id=prod_a.id, quantity=Decimal("100.00")))

    # -------------------------------------------------------------------------
    # Setup Organization B (Farmacia Santa Lucía)
    # -------------------------------------------------------------------------
    org_b = Organization(
        legal_name="Farmacia Santa Lucía S.A.",
        trade_name="Farmacia Santa Lucía",
        identification_type="02",
        identification_number=f"3101{uuid.uuid4().hex[:6]}",
        email="owner_b@santalucia.cr"
    )
    db_session.add(org_b)
    await db_session.flush()

    branch_b = Branch(organization_id=org_b.id, code="001", name="Sucursal Central Santa Lucía", is_main=True)
    db_session.add(branch_b)
    await db_session.flush()

    user_b = User(
        email="owner_b@santalucia.cr",
        password_hash=hash_password("LuciaPass123!"),
        full_name="Propietaria Santa Lucía",
        role=UserRole.OWNER,
        organization_id=org_b.id
    )
    db_session.add(user_b)

    tax_b = TaxRate(organization_id=org_b.id, name="IVA 4%", code_cr="02", rate=Decimal("4.00"))
    db_session.add(tax_b)
    cat_b = Category(organization_id=org_b.id, name="Medicamentos")
    db_session.add(cat_b)
    await db_session.flush()

    prod_b = Product(
        organization_id=org_b.id,
        category_id=cat_b.id,
        tax_rate_id=tax_b.id,
        sku="MED-LUC-01",
        name="Paracetamol 500mg",
        sale_price=Decimal("1500.00"),
        cost_price=Decimal("600.00")
    )
    db_session.add(prod_b)
    await db_session.flush()
    db_session.add(BranchProductStock(branch_id=branch_b.id, product_id=prod_b.id, quantity=Decimal("50.00")))

    await db_session.commit()

    # -------------------------------------------------------------------------
    # Login Users A and B
    # -------------------------------------------------------------------------
    login_a = await client.post("/api/v1/auth/login", json={"email": "owner_a@laespiga.cr", "password": "EspigaPass123!"})
    token_a = login_a.json()["data"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    login_b = await client.post("/api/v1/auth/login", json={"email": "owner_b@santalucia.cr", "password": "LuciaPass123!"})
    token_b = login_b.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # -------------------------------------------------------------------------
    # NEGATIVE TEST 1: Manipulated X-Branch-ID Header
    # User A passes X-Branch-ID of Branch B -> Server must reject or ignore cross-tenant branch
    # -------------------------------------------------------------------------
    headers_a_spoofed = {**headers_a, "X-Branch-ID": str(branch_b.id)}
    me_resp = await client.get("/api/v1/auth/me", headers=headers_a_spoofed)
    assert me_resp.status_code == 200
    # The selected_branch_id must NOT be branch_b!
    # Because branch_b belongs to Org B
    res_data = me_resp.json()["data"]
    assert str(branch_b.id) not in [str(x) for x in res_data.get("accessible_branches", [])]

    # -------------------------------------------------------------------------
    # NEGATIVE TEST 2: Attempt POS sale using Branch B (Sucursal Ajena) in Body
    # -------------------------------------------------------------------------
    sale_cross_branch = {
        "branch_id": str(branch_b.id),
        "items": [{"product_id": str(prod_a.id), "quantity": 1}],
        "payments": [{"payment_method": "CASH_CRC", "amount": 800}]
    }
    sale_resp = await client.post("/api/v1/sales", json=sale_cross_branch, headers=headers_a)
    assert sale_resp.status_code in (400, 403, 404), "Debe rechazar venta en sucursal ajena"

    # -------------------------------------------------------------------------
    # NEGATIVE TEST 3: Attempt POS sale using Product B (Producto Ajeno) in Body
    # -------------------------------------------------------------------------
    sale_cross_prod = {
        "branch_id": str(branch_a.id),
        "items": [{"product_id": str(prod_b.id), "quantity": 1}],
        "payments": [{"payment_method": "CASH_CRC", "amount": 1500}]
    }
    sale_resp2 = await client.post("/api/v1/sales", json=sale_cross_prod, headers=headers_a)
    assert sale_resp2.status_code in (400, 403, 404), "Debe rechazar venta con producto ajeno"

    # -------------------------------------------------------------------------
    # NEGATIVE TEST 4: Query parameter with external branch_id
    # User A asks for products or sales filtering by Branch B
    # -------------------------------------------------------------------------
    prod_filter_resp = await client.get(f"/api/v1/products?branch_id={branch_b.id}", headers=headers_a)
    assert prod_filter_resp.status_code in (200, 400, 403)
    if prod_filter_resp.status_code == 200:
        items = prod_filter_resp.json()["data"]
        # Must return 0 products from Org B!
        assert not any(p["id"] == str(prod_b.id) for p in items)

    # -------------------------------------------------------------------------
    # NEGATIVE TEST 5: Direct UUID access to other Org's Support Ticket
    # User B creates a ticket. User A tries to view or add messages to it.
    # -------------------------------------------------------------------------
    t_create = await client.post(
        "/api/v1/support/tickets",
        json={"subject": "Problema confidencial Santa Lucía", "description": "Detalles secretos de farmacia"},
        headers=headers_b
    )
    assert t_create.status_code == 201
    ticket_b_id = t_create.json()["data"]["id"]

    # User A tries to get ticket B -> 404 / 403
    t_get_a = await client.get(f"/api/v1/support/tickets/{ticket_b_id}", headers=headers_a)
    assert t_get_a.status_code in (403, 404), "User A no debe poder ver ticket de Org B"

    # User A tries to post message to ticket B -> 403 / 404
    t_post_a = await client.post(
        f"/api/v1/support/tickets/{ticket_b_id}/messages",
        json={"message": "Mensaje inyectado por atacante de Org A"},
        headers=headers_a
    )
    assert t_post_a.status_code in (403, 404), "User A no debe poder postear en ticket de Org B"

    # -------------------------------------------------------------------------
    # NEGATIVE TEST 6: Direct UUID access to other Org's Invoices
    # User A creates a sale, generates invoice. User B tries to view or send it.
    # -------------------------------------------------------------------------
    sale_ok = await client.post(
        "/api/v1/sales",
        json={
            "branch_id": str(branch_a.id),
            "items": [{"product_id": str(prod_a.id), "quantity": 1}],
            "payments": [{"payment_method": "CASH_CRC", "amount": 904}]
        },
        headers=headers_a
    )
    assert sale_ok.status_code == 201
    sale_a_id = sale_ok.json()["data"]["id"]

    # User B tries to read receipt of Sale A -> 403 / 404
    receipt_b = await client.get(f"/api/v1/sales/{sale_a_id}/receipt", headers=headers_b)
    assert receipt_b.status_code in (403, 404), "User B no debe poder ver recibo de venta de Org A"

    # User B tries to read XML of Sale A -> 403 / 404
    xml_b = await client.get(f"/api/v1/sales/{sale_a_id}/xml", headers=headers_b)
    assert xml_b.status_code in (403, 404), "User B no debe poder descargar XML de venta de Org A"
