import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_customers_and_electronic_invoices(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    cust_payload = {
        "identification_type": "JURIDICA",
        "identification_number": "3101998877",
        "name": "Corporación El Lago S.A.",
        "email": "facturas@ellago.cr",
        "phone": "2222-3344",
        "address": "San José, Costa Rica"
    }
    cust_resp = await client.post("/api/v1/customers", json=cust_payload, headers=headers)
    assert cust_resp.status_code == 201
    cust_data = cust_resp.json()["data"]
    assert cust_data["name"] == "Corporación El Lago S.A."
    assert cust_data["identification_number"] == "3101998877"

    list_resp = await client.get("/api/v1/customers?search=lago", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1

    inv_resp = await client.get("/api/v1/invoices", headers=headers)
    assert inv_resp.status_code == 200
