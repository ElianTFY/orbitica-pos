import pytest
import asyncio
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.catalog import Product, BranchProductStock
from app.models.consecutive_sequence import ConsecutiveSequence
from app.services.sale_service import SaleService
from app.schemas.sale import SaleCreate

@pytest.mark.asyncio
async def test_overselling_prevention(client: AsyncClient, db_session: AsyncSession, sample_organization):
    # Get auth token
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    
    # Get branch
    b_resp = await client.get("/api/v1/branches", headers={"Authorization": f"Bearer {token}"})
    branch_id = b_resp.json()["data"][0]["id"]

    # Get tax rate
    taxes = await client.get("/api/v1/tax-rates", headers={"Authorization": f"Bearer {token}"})
    tax_id = taxes.json()["data"][0]["id"]

    # Create limited stock product (Stock = 1)
    p_resp = await client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Aceite Vegetal 1L",
            "sku": "ACE-001",
            "cost_price": 1200.0,
            "sale_price": 1695.0,
            "tax_rate_id": tax_id,
            "is_service": False
        }
    )
    prod_id = p_resp.json()["data"]["id"]

    # Set stock = 1
    stock_rec = BranchProductStock(branch_id=branch_id, product_id=prod_id, quantity=Decimal("1.00"))
    db_session.add(stock_rec)
    await db_session.commit()

    sale_payload = {
        "branch_id": branch_id,
        "currency": "CRC",
        "items": [{"product_id": prod_id, "quantity": 1, "discount_percentage": 0}],
        "payments": [{"payment_method": "CASH_CRC", "amount": 2000.0}]
    }

    # Sale 1 (Should succeed)
    s1 = await client.post("/api/v1/sales", headers={"Authorization": f"Bearer {token}"}, json=sale_payload)
    assert s1.status_code == 201

    # Sale 2 (Stock exhausted -> must fail with 400 Insufficient Stock)
    s2 = await client.post("/api/v1/sales", headers={"Authorization": f"Bearer {token}"}, json=sale_payload)
    assert s2.status_code == 400
    assert "Stock insuficiente" in s2.json()["error"]["message"]

    # Verify database stock is exactly 0.00 and NEVER negative
    stmt = select(BranchProductStock).where(
        BranchProductStock.branch_id == branch_id,
        BranchProductStock.product_id == prod_id
    )
    res = await db_session.execute(stmt)
    stk = res.scalar_one()
    assert stk.quantity == Decimal("0.00")

@pytest.mark.asyncio
async def test_consecutive_atomicity_and_zero_duplicate_keys(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    
    b_resp = await client.get("/api/v1/branches", headers={"Authorization": f"Bearer {token}"})
    branch_id = b_resp.json()["data"][0]["id"]

    taxes = await client.get("/api/v1/tax-rates", headers={"Authorization": f"Bearer {token}"})
    tax_id = taxes.json()["data"][0]["id"]

    # Service product with unlimited stock
    p_resp = await client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Servicio de Mantenimiento",
            "sku": "SRV-001",
            "cost_price": 5000.0,
            "sale_price": 10000.0,
            "tax_rate_id": tax_id,
            "is_service": True
        }
    )
    prod_id = p_resp.json()["data"]["id"]

    sale_payload = {
        "branch_id": branch_id,
        "currency": "CRC",
        "items": [{"product_id": prod_id, "quantity": 1, "discount_percentage": 0}],
        "payments": [{"payment_method": "CASH_CRC", "amount": 11300.0}]
    }

    # Execute 5 consecutive sales
    sale_numbers = []
    for _ in range(5):
        s = await client.post("/api/v1/sales", headers={"Authorization": f"Bearer {token}"}, json=sale_payload)
        assert s.status_code == 201
        sale_numbers.append(s.json()["data"]["sale_number"])

    # Verify all 5 sale numbers are distinct and sequential
    assert len(set(sale_numbers)) == 5
    assert sale_numbers == ["V-000001", "V-000002", "V-000003", "V-000004", "V-000005"]
