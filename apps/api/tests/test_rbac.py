import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_rbac_cashier_cannot_create_branches(client: AsyncClient):
    # Register Org
    org_payload = {
        "legal_name": "Farmacia Central S.A.",
        "trade_name": "Farmacia Central",
        "identification_type": "JURIDICA",
        "identification_number": "3101333333",
        "email": "farmacia@central.cr",
        "owner_email": "owner@farmacia.cr",
        "owner_password": "FarmaciaPass123!",
        "owner_full_name": "Dra. Central"
    }
    await client.post("/api/v1/organizations/register", json=org_payload)

    # Login Owner
    owner_login = await client.post("/api/v1/auth/login", json={"email": "owner@farmacia.cr", "password": "FarmaciaPass123!"})
    owner_token = owner_login.json()["data"]["access_token"]

    # Owner creates Cashier User
    cashier_payload = {
        "email": "cajero@farmacia.cr",
        "password": "CajeroPass123!",
        "full_name": "Juan Cajero",
        "role": "cashier"
    }
    create_user_resp = await client.post("/api/v1/users", json=cashier_payload, headers={"Authorization": f"Bearer {owner_token}"})
    assert create_user_resp.status_code == 201

    # Login as Cashier
    cashier_login = await client.post("/api/v1/auth/login", json={"email": "cajero@farmacia.cr", "password": "CajeroPass123!"})
    cashier_token = cashier_login.json()["data"]["access_token"]

    # Cashier tries to create a new branch -> Expect 403 Forbidden
    branch_payload = {
        "code": "002",
        "name": "Sucursal Prohibida",
        "is_main": False
    }
    forbidden_resp = await client.post("/api/v1/branches", json=branch_payload, headers={"Authorization": f"Bearer {cashier_token}"})
    assert forbidden_resp.status_code == 403
    assert forbidden_resp.json()["error"]["code"] == "FORBIDDEN"
