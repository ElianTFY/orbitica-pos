import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_inventory_adjustment_and_movements(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    branches_resp = await client.get("/api/v1/branches", headers=headers)
    branch_id = branches_resp.json()["data"][0]["id"]

    tax_resp = await client.get("/api/v1/tax-rates", headers=headers)
    tax_id = tax_resp.json()["data"][0]["id"]

    prod_resp = await client.post(
        "/api/v1/products",
        json={"name": "Arroz Tío Pelón 1kg", "tax_rate_id": tax_id, "sku": "ARR-001", "sale_price": 1100, "min_stock_alert": 10},
        headers=headers
    )
    prod_id = prod_resp.json()["data"]["id"]

    adj_resp = await client.post(
        "/api/v1/inventory/adjust",
        json={"branch_id": branch_id, "product_id": prod_id, "quantity": 50, "movement_type": "IN_PURCHASE", "reason": "Compra factura #1234"},
        headers=headers
    )
    assert adj_resp.status_code == 200
    assert float(adj_resp.json()["data"]["new_quantity"]) == 50.0

    mov_resp = await client.get(f"/api/v1/inventory/movements?product_id={prod_id}", headers=headers)
    assert mov_resp.status_code == 200
    movements = mov_resp.json()["data"]
    assert len(movements) == 1
    assert movements[0]["movement_type"] == "IN_PURCHASE"
    assert float(movements[0]["quantity"]) == 50.0

    low_resp = await client.get(f"/api/v1/inventory/low-stock?branch_id={branch_id}", headers=headers)
    assert low_resp.status_code == 200

    await client.post(
        "/api/v1/inventory/adjust",
        json={"branch_id": branch_id, "product_id": prod_id, "quantity": -45, "movement_type": "WASTE", "reason": "Dañado"},
        headers=headers
    )
    low_resp2 = await client.get(f"/api/v1/inventory/low-stock?branch_id={branch_id}", headers=headers)
    assert low_resp2.status_code == 200
    low_items = low_resp2.json()["data"]
    assert any(item["product_id"] == prod_id for item in low_items)