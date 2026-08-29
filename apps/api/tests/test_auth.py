import pytest
from httpx import AsyncClient
from app.models.user import User

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, sample_organization):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in resp.cookies

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, sample_organization):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "WrongPassword!"}
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"

@pytest.mark.asyncio
async def test_login_account_lockout(client: AsyncClient, sample_organization):
    # 5 failed attempts
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "owner@elsol.cr", "password": "BadPassword"}
        )
    
    # 6th attempt should be locked
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "BadPassword"}
    )
    assert resp.status_code == 423
    assert resp.json()["error"]["code"] == "ACCOUNT_LOCKED"

@pytest.mark.asyncio
async def test_get_me_profile(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]

    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    profile = me_resp.json()["data"]
    assert profile["email"] == "owner@elsol.cr"
    assert profile["role"] == "owner"
    assert "pos:sell" in profile["permissions"]
