import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_atomic_pos_sale_and_refund(client: AsyncClient, sample_organization):
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
        json={"name": "Galleta María Pozuelo", "tax_rate_id": tax_id, "sale_price": 500, "cost_price": 300},
        headers=headers
    )
    prod_id = prod_resp.json()["data"]["id"]

    await client.post(
        "/api/v1/inventory/adjust",
        json={"branch_id": branch_id, "product_id": prod_id, "quantity": 10, "movement_type": "IN_PURCHASE" , "reason": "Stock inicial"},
        headers=headers
    )

    sale_payload = {
        "branch_id": branch_id,
        "items": [
            {"product_id": prod_id, "quantity": 2, "discount_percentage": 0}
        ],
        "payments": [
            {"payment_method": "CASH_CRC", "amount": 500},
            {"payment_method": "SINPE", "amount": 500, "reference_number": "SINPE-998877"}
        ]
    }
    sale_resp = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert sale_resp.status_code == 201
    sale_data = sale_resp.json()["data"]
    assert float(sale_data["total_amount"]) == 1000.0
    assert sale_data["status"] == "COMPLETED"
    sale_id = sale_data["id"]

    mov_resp = await client.get(f"/api/v1/inventory/movements?product_id={prod_id}", headers=headers)
    assert mov_resp.status_code == 200
    movements = mov_resp.json()["data"]
    assert movements[0]["movement_type"] == "OUT_SALE"
    assert float(movements[0]["quantity"]) == -2.0
    assert float(movements[0]["new_quantity"]) == 8.0

    refund_resp = await client.post(
        f"/api/v1/sales/{sale_id}/refund",
        json={"reason": "Cliente solicitó cambio"},
        headers=headers
    )
    assert refund_resp.status_code == 200
    assert refund_resp.json()["data"]["status"] == "REFUNDED"

    mov_resp2 = await client.get(f"/api/v1/inventory/movements?product_id={prod_id}", headers=headers)
    movements2 = mov_resp2.json()["data"]
    assert movements2[0]["movement_type"] == "RETURN_IN"
    assert float(movements2[0]["quantity"]) == 2.0
    assert float(movements2[0]["new_quantity"]) == 10.0