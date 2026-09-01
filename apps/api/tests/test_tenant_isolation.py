import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_tenant_isolation(client: AsyncClient):
    # Register Organization 1
    org1_payload = {
        "legal_name": "Empresa Alfa S.A.",
        "trade_name": "Alfa Market",
        "identification_type": "JURIDICA",
        "identification_number": "3101111111",
        "email": "alfa@empresa.cr",
        "owner_email": "owner@alfa.cr",
        "owner_password": "AlfaPassword123!",
        "owner_full_name": "Owner Alfa"
    }
    r1 = await client.post("/api/v1/organizations/register", json=org1_payload)
    assert r1.status_code == 201

    # Register Organization 2
    org2_payload = {
        "legal_name": "Empresa Beta S.A.",
        "trade_name": "Beta Market",
        "identification_type": "JURIDICA",
        "identification_number": "3101222222",
        "email": "beta@empresa.cr",
        "owner_email": "owner@beta.cr",
        "owner_password": "BetaPassword123!",
        "owner_full_name": "Owner Beta"
    }
    r2 = await client.post("/api/v1/organizations/register", json=org2_payload)
    assert r2.status_code == 201

    # Login as Org 1 Owner
    login1 = await client.post("/api/v1/auth/login", json={"email": "owner@alfa.cr", "password": "AlfaPassword123!"})
    token1 = login1.json()["data"]["access_token"]

    # Login as Org 2 Owner
    login2 = await client.post("/api/v1/auth/login", json={"email": "owner@beta.cr", "password": "BetaPassword123!"})
    token2 = login2.json()["data"]["access_token"]

    # Org 1 queries branches
    b1_resp = await client.get("/api/v1/branches", headers={"Authorization": f"Bearer {token1}"})
    branches1 = b1_resp.json()["data"]
    assert len(branches1) == 1
    branch1_id = branches1[0]["id"]

    # Org 2 queries branches
    b2_resp = await client.get("/api/v1/branches", headers={"Authorization": f"Bearer {token2}"})
    branches2 = b2_resp.json()["data"]
    assert len(branches2) == 1
    branch2_id = branches2[0]["id"]

    # Verify distinct IDs
    assert branch1_id != branch2_id

    # Org 2 tries to access Org 1's branch directly (IDOR check) -> must return 404
    idor_resp = await client.get(f"/api/v1/branches/{branch1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert idor_resp.status_code == 404
    assert idor_resp.json()["error"]["code"] == "NOT_FOUND"

    # Org 1 creates a product
    taxes1 = await client.get("/api/v1/tax-rates", headers={"Authorization": f"Bearer {token1}"})
    tax1_id = taxes1.json()["data"][0]["id"]

    p1_resp = await client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {token1}"},
        json={
            "name": "Arroz Tío Pelón 1kg",
            "sku": "ARR-001",
            "cost_price": 800.0,
            "sale_price": 1130.0,
            "tax_rate_id": tax1_id
        }
    )
    assert p1_resp.status_code == 201
    prod1_id = p1_resp.json()["data"]["id"]

    # Org 2 tries to read Org 1's product -> must return 404 (IDOR check)
    idor_p2 = await client.get(f"/api/v1/products/{prod1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert idor_p2.status_code == 404

    # Org 2 tries to sell Org 1's product -> must fail with 404
    fail_sale = await client.post(
        "/api/v1/sales",
        headers={"Authorization": f"Bearer {token2}"},
        json={
            "branch_id": branch2_id,
            "currency": "CRC",
            "items": [{"product_id": prod1_id, "quantity": 1, "discount_percentage": 0}],
            "payments": [{"payment_method": "CASH_CRC", "amount": 1500.0}]
        }
    )
    assert fail_sale.status_code == 404
