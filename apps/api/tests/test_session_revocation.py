import pytest
from httpx import AsyncClient
from app.security.tokens import create_access_token
from app.services.auth_service import AuthService


async def login(client):
    response = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr", "password": "OwnerPassword123!",
    })
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_logout_revokes_access_family_but_not_other_login(client, sample_organization):
    first_access = await login(client)
    first_refresh = client.cookies.get("refresh_token")
    second_access = await login(client)
    await client.post("/api/v1/auth/logout")
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {second_access}"})).status_code == 401
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {first_access}"})).status_code == 200
    # Rotation keeps the first access token valid until its family's logout.
    rotation = await client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": first_refresh})
    assert rotation.status_code == 200
    rotated_access = rotation.json()["data"]["access_token"]
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {first_access}"})).status_code == 200
    await client.post("/api/v1/auth/logout")
    for access in (first_access, rotated_access):
        assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})).status_code == 401


@pytest.mark.asyncio
async def test_password_reset_revokes_all_access_tokens(client, db_session, sample_organization):
    accesses = [await login(client), await login(client)]
    token = await AuthService(db_session).request_password_recovery("owner@elsol.cr")
    reset = await client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "NewSecret2026!"})
    assert reset.status_code == 200
    for access in accesses:
        assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})).status_code == 401
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401
    assert (await client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "OtherSecret2026!"})).status_code == 401


@pytest.mark.asyncio
async def test_signed_but_unbound_access_token_is_rejected(client, sample_organization):
    from app.security.tokens import decode_access_token
    valid = await login(client)
    legacy = create_access_token(decode_access_token(valid)["sub"])
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {legacy}"})).status_code == 401
