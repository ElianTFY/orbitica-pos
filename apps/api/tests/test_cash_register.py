import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_cash_register_lifecycle_and_balance(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    branches_resp = await client.get("/api/v1/branches", headers=headers)
    branch_id = branches_resp.json()["data"][0]["id"]

    reg_resp = await client.post(
        "/api/v1/cash-registers",
        json={"branch_id": branch_id, "name": "Caja Principal 01", "pos_terminal_number": "00001"},
        headers=headers
    )
    assert reg_resp.status_code == 201
    reg_id = reg_resp.json()["data"]["id"]

    open_resp = await client.post(
        "/api/v1/cash-registers/sessions/open",
        json={"cash_register_id": reg_id, "initial_cash_amount": 25000, "notes": "Apertura matutina"},
        headers=headers
    )
    assert open_resp.status_code == 201
    session_id = open_resp.json()["data"]["id"]
    assert float(open_resp.json()["data"]["initial_cash_amount"]) == 25000.0

    active_resp = await client.get("/api/v1/cash-registers/sessions/active", headers=headers)
    assert active_resp.status_code == 200
    assert active_resp.json()["data"]["id"] == session_id

    close_resp = await client.post(
        f"/api/v1/cash-registers/sessions/{session_id}/close",
        json={"actual_cash_amount": 25500, "notes": "Cierre con 500 CRC sobrante"},
        headers=headers
    )
    assert close_resp.status_code == 200
    close_data = close_resp.json()["data"]
    assert close_data["status"] == "CLOSED"
    assert float(close_data["actual_cash_amount"]) == 25500.0
    assert float(close_data["cash_difference"]) == 500.0
