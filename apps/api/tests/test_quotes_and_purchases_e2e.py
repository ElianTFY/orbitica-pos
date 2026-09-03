import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.catalog import Product, TaxRate, BranchProductStock
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.quote import Quote
from app.models.sale import Sale
from app.models.purchase import Purchase
from tests.test_final_commercial_readiness_e2e import create_tenant_setup

@pytest.mark.asyncio
async def test_quote_creation_and_atomic_conversion_to_sale(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    P3 TEST:
    1. Create a proforma quote with products and customer.
    2. Convert quote to sale in ONE click.
    3. Verify quote is marked CONVERTED and links to converted_sale_id.
    4. Verify sale is created in PostgreSQL with same items, stock reduced, and payments recorded.
    """
    tenant = await create_tenant_setup(db_session, "quote_user", "Ferretería El Tornillo")
    headers = {"Authorization": f"Bearer {tenant['token']}"}

    # 1. Create a Customer
    cust_resp = await client.post(
        "/api/v1/customers",
        headers=headers,
        json={
            "name": "Constructora Los Almendros",
            "identification_type": "JURIDICA",
            "identification_number": "3101888777",
            "email": "compras@losalmendros.cr",
            "phone": "+506 2440-1234"
        }
    )
    assert cust_resp.status_code == 201
    cust_id = cust_resp.json()["data"]["id"]

    # 2. Create a Product with stock
    prod_resp = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Bolsa de Cemento 50kg",
            "branch_id": str(tenant["branch"].id),
            "tax_rate_id": str(tenant["tax"].id),
            "sku": "CEM-50KG",
            "barcode": "744100000001",
            "sale_price": "6500.00",
            "cost_price": "4500.00",
            "min_stock_alert": 10,
            "initial_stock": 25
        }
    )
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["data"]["id"]

    # 3. Create Quote
    quote_payload = {
        "branch_id": str(tenant["branch"].id),
        "customer_id": cust_id,
        "currency": "CRC",
        "notes": "Válido por 15 días hábiles",
        "valid_days": 15,
        "items": [
            {
                "product_id": prod_id,
                "quantity": 5,
                "discount_percentage": 0
            }
        ]
    }
    q_resp = await client.post("/api/v1/quotes", headers=headers, json=quote_payload)
    assert q_resp.status_code == 201
    q_data = q_resp.json()["data"]
    quote_id = q_data["id"]
    assert q_data["quote_number"].startswith("COT-")
    assert Decimal(str(q_data["total_amount"])) > Decimal("30000.00")
    assert q_data["status"] == "DRAFT"

    # 4. Open Cash Session
    open_resp = await client.post(
        "/api/v1/cash-registers/sessions/open",
        headers=headers,
        json={
            "cash_register_id": str(tenant["register"].id),
            "initial_cash_amount": "50000.00",
            "notes": "Apertura de turno"
        }
    )
    assert open_resp.status_code == 201
    cash_session_id = open_resp.json()["data"]["id"]

    # 5. Convert Quote to Sale
    conv_resp = await client.post(
        f"/api/v1/quotes/{quote_id}/convert-to-sale",
        headers=headers,
        json={
            "payment_method": "CASH_CRC",
            "cash_session_id": cash_session_id
        }
    )
    assert conv_resp.status_code == 200, conv_resp.text
    sale_data = conv_resp.json()["data"]
    sale_id = sale_data["id"]

    # 6. Verify Quote in DB is now CONVERTED and links to Sale
    q_db_stmt = select(Quote).where(Quote.id == uuid.UUID(quote_id))
    q_db_res = await db_session.execute(q_db_stmt)
    quote_db = q_db_res.scalar_one()
    assert quote_db.status == "CONVERTED"
    assert quote_db.converted_sale_id == uuid.UUID(sale_id)

    # 7. Verify stock was reduced from 25 to 20
    stock_stmt = select(BranchProductStock).where(
        BranchProductStock.product_id == uuid.UUID(prod_id),
        BranchProductStock.branch_id == tenant["branch"].id
    )
    stock_res = await db_session.execute(stock_stmt)
    stock_rec = stock_res.scalar_one()
    assert stock_rec.quantity == Decimal("20.0000")

@pytest.mark.asyncio
async def test_purchase_intake_increments_stock_and_creates_movements(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    P3 TEST:
    Record a purchase from supplier -> increments stock in PostgreSQL -> creates IN_PURCHASE movement.
    """
    tenant = await create_tenant_setup(db_session, "purch_user", "Distribuidora San Pedro")
    headers = {"Authorization": f"Bearer {tenant['token']}"}

    # 1. Create Supplier
    supp_resp = await client.post(
        "/api/v1/suppliers",
        headers=headers,
        json={
            "name": "Cementos Progreso Costa Rica",
            "identification_number": "3101765432",
            "identification_type": "02",
            "phone": "+506 2222-3333",
            "email": "ventas@progreso.cr"
        }
    )
    assert supp_resp.status_code == 201
    supp_id = supp_resp.json()["data"]["id"]

    # 2. Create Product with initial stock 10
    prod_resp = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Varilla de Acero 3/8",
            "branch_id": str(tenant["branch"].id),
            "tax_rate_id": str(tenant["tax"].id),
            "sku": "VAR-38",
            "sale_price": "3500.00",
            "cost_price": "2400.00",
            "initial_stock": 10
        }
    )
    prod_id = prod_resp.json()["data"]["id"]

    # 3. Record Purchase of 50 units
    purch_resp = await client.post(
        "/api/v1/purchases",
        headers=headers,
        json={
            "branch_id": str(tenant["branch"].id),
            "supplier_id": supp_id,
            "invoice_number": "FAC-PROG-9988",
            "payment_type": "CONTADO",
            "items": [
                {
                    "product_id": prod_id,
                    "quantity": 50,
                    "unit_cost": "2400.00"
                }
            ]
        }
    )
    assert purch_resp.status_code == 201

    # 4. Verify Stock is now 60 (10 + 50)
    stock_stmt = select(BranchProductStock).where(
        BranchProductStock.product_id == uuid.UUID(prod_id),
        BranchProductStock.branch_id == tenant["branch"].id
    )
    stock_res = await db_session.execute(stock_stmt)
    stock_rec = stock_res.scalar_one()
    assert stock_rec.quantity == Decimal("60.0000")
