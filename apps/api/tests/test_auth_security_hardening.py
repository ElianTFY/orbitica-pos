import pytest
import uuid
from httpx import AsyncClient
from app.models.organization import Organization
from app.models.user import User

def get_error_message(json_data: dict) -> str:
    if not json_data:
        return ""
    if "detail" in json_data:
        return str(json_data["detail"])
    if "error" in json_data and isinstance(json_data["error"], dict):
        return str(json_data["error"].get("message", ""))
    if "message" in json_data:
        return str(json_data["message"])
    return ""

@pytest.mark.asyncio
async def test_unknown_email_returns_401(client: AsyncClient):
    res = await client.post("/api/v1/auth/login", json={
        "email": "nonexistent_attacker_account@evil.com",
        "password": "RandomPassword123!"
    })
    assert res.status_code == 401
    msg = get_error_message(res.json())
    assert "Credenciales incorrectas" in msg

@pytest.mark.asyncio
async def test_superadmin_wrong_password_returns_401(client: AsyncClient, superadmin_user: User):
    res = await client.post("/api/v1/auth/login", json={
        "email": "superadmin@orbitica.cr",
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401
    msg = get_error_message(res.json())
    assert "Credenciales incorrectas" in msg

@pytest.mark.asyncio
async def test_tampered_token_returns_401(client: AsyncClient):
    tampered_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"}
    res = await client.get("/api/v1/auth/me", headers=tampered_headers)
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_owner_cannot_access_superadmin_endpoints(client: AsyncClient, sample_organization: Organization):
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access superadmin endpoints
    metrics_res = await client.get("/api/v1/superadmin/stats", headers=headers)
    assert metrics_res.status_code == 403

    tenants_res = await client.get("/api/v1/superadmin/organizations", headers=headers)
    assert tenants_res.status_code == 403

@pytest.mark.asyncio
async def test_owner_cannot_escalate_role_to_superadmin_or_owner(client: AsyncClient, sample_organization: Organization):
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Owner attempts to create a user with role 'superadmin' -> MUST BE REJECTED with 403!
    res = await client.post("/api/v1/users", json={
        "email": "malicious_admin@elsol.cr",
        "password": "Password123!",
        "full_name": "Intruder User",
        "role": "superadmin"
    }, headers=headers)
    assert res.status_code == 403
    assert "no tiene autorización" in get_error_message(res.json())

    # 2. Owner attempts to create a user with role 'platform_support' -> MUST BE REJECTED with 403!
    res_support = await client.post("/api/v1/users", json={
        "email": "malicious_support@elsol.cr",
        "password": "Password123!",
        "full_name": "Intruder Support",
        "role": "platform_support"
    }, headers=headers)
    assert res_support.status_code == 403

    # 3. Owner can legitimately create a cashier
    res_cashier = await client.post("/api/v1/users", json={
        "email": f"cashier_{uuid.uuid4().hex[:6]}@elsol.cr",
        "password": "Password123!",
        "full_name": "Legit Cashier",
        "role": "cashier"
    }, headers=headers)
    assert res_cashier.status_code == 201

@pytest.mark.asyncio
async def test_account_lockout_after_five_failed_attempts(client: AsyncClient, sample_organization: Organization):
    # Attempt 5 wrong passwords
    for _ in range(5):
        await client.post("/api/v1/auth/login", json={
            "email": "owner@elsol.cr",
            "password": "IncorrectPassword!"
        })

    # 6th attempt with correct password must be locked out
    locked_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    assert locked_res.status_code == 423
    msg = get_error_message(locked_res.json())
    assert "bloqueada" in msg.lower()
