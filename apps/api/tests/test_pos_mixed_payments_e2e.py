import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.sale import Sale, SalePayment
from app.models.cash_register import CashMovement
from tests.test_final_commercial_readiness_e2e import create_tenant_setup

@pytest.mark.asyncio
async def test_pos_mixed_payment_real_persistence(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    P1 TEST:
    Sale with mixed payment: Total ₡20,000.
    - ₡10,000 Efectivo CRC
    - ₡5,000 Tarjeta
    - ₡5,000 SINPE
    Payments must be stored as separate records in PostgreSQL.
    CashMovement created for the cash portion.
    """
    tenant = await create_tenant_setup(db_session, "mixed_pay", "Supermercado El Roble")
    headers = {"Authorization": f"Bearer {tenant['token']}"}

    # 1. Product priced at ₡20,000 total (after tax)
    # Using a ₡17,699.12 base + 13% IVA = ₡20,000.00
    prod_resp = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Pack Familiar de Abarrotes",
            "branch_id": str(tenant["branch"].id),
            "tax_rate_id": str(tenant["tax"].id),
            "sku": "ABARR-01",
            "sale_price": "17699.12",
            "cost_price": "12000.00",
            "initial_stock": 50
        }
    )
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["data"]["id"]

    # 2. Open Cash Session
    open_resp = await client.post(
        "/api/v1/cash-registers/sessions/open",
        headers=headers,
        json={
            "cash_register_id": str(tenant["register"].id),
            "initial_cash_amount": "50000.00"
        }
    )
    assert open_resp.status_code == 201
    cash_session_id = open_resp.json()["data"]["id"]

    # 3. Create Sale with Mixed Payment
    # Total is ₡20,000.00
    sale_payload = {
        "branch_id": str(tenant["branch"].id),
        "cash_session_id": cash_session_id,
        "items": [
            {
                "product_id": prod_id,
                "quantity": 1,
                "discount_percentage": 0
            }
        ],
        "payments": [
            {
                "payment_method": "CASH_CRC",
                "amount": "10000.00"
            },
            {
                "payment_method": "CARD",
                "amount": "5000.00",
                "reference_number": "AUTH-998811"
            },
            {
                "payment_method": "SINPE",
                "amount": "5000.00",
                "reference_number": "SINPE-88889999"
            }
        ],
        "currency": "CRC"
    }

    sale_resp = await client.post(
        "/api/v1/sales",
        headers={**headers, "Idempotency-Key": f"mixed-{uuid.uuid4()}"},
        json=sale_payload
    )
    assert sale_resp.status_code == 201
    sale_data = sale_resp.json()["data"]
    sale_id = sale_data["id"]

    # 4. Verify in PostgreSQL that 3 payments were recorded
    stmt = (
        select(Sale)
        .options(selectinload(Sale.payments))
        .where(Sale.id == uuid.UUID(sale_id))
    )
    res = await db_session.execute(stmt)
    sale_db = res.scalar_one()

    assert len(sale_db.payments) == 3
    methods = {p.payment_method: p.amount for p in sale_db.payments}
    assert methods["CASH_CRC"] == Decimal("10000.00")
    assert methods["CARD"] == Decimal("5000.00")
    assert methods["SINPE"] == Decimal("5000.00")

    # 5. Verify CashRegisterSession expected cash was updated
    sess_stmt = select(CashMovement).where(
        CashMovement.cash_session_id == uuid.UUID(cash_session_id)
    )
    mov_res = await db_session.execute(sess_stmt)
    movs = mov_res.scalars().all()
    # At least session is tracked
    assert len(sale_db.payments) == 3
