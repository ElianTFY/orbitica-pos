import pytest
import pyotp
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.constants import UserRole
from app.security.password import hash_password

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

@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    assert login_resp.status_code == 200
    refresh_cookie = login_resp.cookies.get("refresh_token")
    assert refresh_cookie is not None

    # Rotate refresh token
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_cookie}
    )
    assert refresh_resp.status_code == 200
    new_token = refresh_resp.json()["data"]["access_token"]
    assert new_token is not None
    new_refresh_cookie = refresh_resp.cookies.get("refresh_token")
    assert new_refresh_cookie != refresh_cookie

    # Old refresh token is now revoked and must fail
    fail_resp = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_cookie}
    )
    assert fail_resp.status_code == 401

@pytest.mark.asyncio
async def test_password_recovery_and_reset(client: AsyncClient, db_session: AsyncSession, sample_organization):
    # 1. Request recovery
    rec_resp = await client.post(
        "/api/v1/auth/recovery",
        json={"email": "owner@elsol.cr"}
    )
    assert rec_resp.status_code == 200
    assert rec_resp.json()["data"]["sent"] is True

    # Inspect DB to get recovery token hash
    stmt = select(User).where(User.email == "owner@elsol.cr")
    res = await db_session.execute(stmt)
    user = res.scalar_one()
    assert user.recovery_token_hash is not None

    # 2. Reset password directly with service token simulation
    from app.services.auth_service import AuthService
    auth_service = AuthService(db_session)
    raw_token = await auth_service.request_password_recovery("owner@elsol.cr")

    reset_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "NewSecurePassword2026!"}
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["data"]["reset"] is True

    # 3. Old password fails, new password succeeds
    fail_old = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    assert fail_old.status_code == 401

    succ_new = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "NewSecurePassword2026!"}
    )
    assert succ_new.status_code == 200

@pytest.mark.asyncio
async def test_step_up_authentication(client: AsyncClient, sample_organization):
    # Login first
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]

    # Issue Step-Up token with correct password
    stepup_resp = await client.post(
        "/api/v1/auth/step-up",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "password": "OwnerPassword123!",
            "action": "FISCAL_CERT_UPLOAD",
            "target_resource": "org_el_sol"
        }
    )
    assert stepup_resp.status_code == 200
    stepup_data = stepup_resp.json()["data"]
    assert "step_up_token" in stepup_data
    assert stepup_data["action"] == "FISCAL_CERT_UPLOAD"

    # Step-Up with wrong password fails
    fail_stepup = await client.post(
        "/api/v1/auth/step-up",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "password": "WrongPassword!",
            "action": "FISCAL_CERT_UPLOAD",
            "target_resource": "org_el_sol"
        }
    )
    assert fail_stepup.status_code == 401

@pytest.mark.asyncio
async def test_superadmin_totp_mfa(client: AsyncClient, db_session: AsyncSession):
    # Create superadmin with TOTP secret
    totp_secret = pyotp.random_base32()
    totp = pyotp.TOTP(totp_secret)
    
    superadmin = User(
        email="superadmin.mfa@orbitica.cr",
        password_hash=hash_password("SuperAdminSecret2026!"),
        full_name="Superadmin MFA",
        role=UserRole.SUPERADMIN,
        totp_secret=totp_secret,
        totp_enabled=True
    )
    db_session.add(superadmin)
    await db_session.commit()

    # Login without TOTP code fails
    no_totp_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin.mfa@orbitica.cr", "password": "SuperAdminSecret2026!"}
    )
    assert no_totp_resp.status_code == 401
    assert "TOTP" in no_totp_resp.json()["error"]["message"]

    # Login with wrong TOTP fails
    bad_totp_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "superadmin.mfa@orbitica.cr",
            "password": "SuperAdminSecret2026!",
            "totp_code": "000000"
        }
    )
    assert bad_totp_resp.status_code == 401

    # Login with valid TOTP code succeeds
    valid_code = totp.now()
    good_totp_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "superadmin.mfa@orbitica.cr",
            "password": "SuperAdminSecret2026!",
            "totp_code": valid_code
        }
    )
    assert good_totp_resp.status_code == 200
    assert "access_token" in good_totp_resp.json()["data"]

@pytest.mark.asyncio
async def test_privilege_escalation_blocked(db_session: AsyncSession):
    from app.services.auth_service import AuthService
    from app.core.exceptions import ForbiddenException
    auth_service = AuthService(db_session)

    # Owner cannot assign Superadmin role
    with pytest.raises(ForbiddenException):
        auth_service.validate_role_assignment(UserRole.OWNER, UserRole.SUPERADMIN)

    # Manager cannot assign Owner or Superadmin role
    with pytest.raises(ForbiddenException):
        auth_service.validate_role_assignment(UserRole.MANAGER, UserRole.OWNER)

    # Owner can assign Manager, Cashier, Accountant
    auth_service.validate_role_assignment(UserRole.OWNER, UserRole.MANAGER)
    auth_service.validate_role_assignment(UserRole.OWNER, UserRole.CASHIER)
    auth_service.validate_role_assignment(UserRole.OWNER, UserRole.ACCOUNTANT)

@pytest.mark.asyncio
async def test_superadmin_first_login_mfa_challenge_blocks_unverified(client: AsyncClient, db_session: AsyncSession):
    """
    Mandato de Auditoría:
    Verifica que un superadmin nuevo NO se autoactive ni reciba tokens en su primer login.
    Debe recibir un challenge 401 con MFA_ENROLLMENT_REQUIRED hasta verificar el primer código.
    """
    new_superadmin = User(
        email="fresh.superadmin@orbitica.cr",
        password_hash=hash_password("FreshAdmin2026!"),
        full_name="Fresh Superadmin",
        role=UserRole.SUPERADMIN,
        totp_secret=None,
        totp_enabled=False
    )
    db_session.add(new_superadmin)
    await db_session.commit()

    # 1. First login attempt without TOTP -> Must be BLOCKED with 401 and challenge
    block_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "fresh.superadmin@orbitica.cr", "password": "FreshAdmin2026!"}
    )
    assert block_resp.status_code == 401
    assert "MFA_ENROLLMENT_REQUIRED" in block_resp.json()["error"]["message"]

    # 2. Inspect DB: a secret was generated, but totp_enabled remains False!
    await db_session.refresh(new_superadmin)
    assert new_superadmin.totp_secret is not None
    assert new_superadmin.totp_enabled is False

    # 3. Supplying wrong TOTP code -> Still fails 401
    bad_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "fresh.superadmin@orbitica.cr",
            "password": "FreshAdmin2026!",
            "totp_code": "999999"
        }
    )
    assert bad_resp.status_code == 401

    # 4. Supplying valid TOTP code -> Activates and succeeds 200
    totp = pyotp.TOTP(new_superadmin.totp_secret)
    valid_code = totp.now()

    succ_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "fresh.superadmin@orbitica.cr",
            "password": "FreshAdmin2026!",
            "totp_code": valid_code
        }
    )
    assert succ_resp.status_code == 200
    assert "access_token" in succ_resp.json()["data"]

    # 5. DB confirms totp_enabled is now True
    await db_session.refresh(new_superadmin)
    assert new_superadmin.totp_enabled is True
