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

    # Org 2 tries to access Org 1's branch directly (IDOR check)
    idor_resp = await client.get(f"/api/v1/branches/{branch1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert idor_resp.status_code == 404
    assert idor_resp.json()["error"]["code"] == "NOT_FOUND"
