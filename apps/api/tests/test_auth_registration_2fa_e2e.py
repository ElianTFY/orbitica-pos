import pytest
import uuid
import secrets
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserSession
from app.models.organization import Organization, OrganizationMembership
from app.models.subscription import Subscription
from app.models.onboarding import OrganizationOnboarding
from app.models.auth_challenge import EmailVerificationChallenge, TwoFactorChallenge
from app.security.password import hash_password
from app.security.tokens import hash_token
from app.adapters.email_adapter import get_email_adapter, ConsoleEmailAdapter

@pytest.mark.asyncio
async def test_email_verification_flow_never_exposes_code(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    1. Start registration:
       - generates 6-digit code, stores ONLY hash in DB.
       - NEVER returns code in API response.
    2. Random 6-digit code must fail (400).
    3. Correct code verified from DB hash succeeds and returns registration token.
    4. Code cannot be reused (one-time use).
    """
    test_email = f"verified_{uuid.uuid4().hex[:8]}@orbitica.cr"

    # 1. Start registration
    start_resp = await client.post(
        "/api/v1/auth/register/start",
        json={"email": test_email}
    )
    assert start_resp.status_code == 200
    start_data = start_resp.json()
    assert "data" in start_data
    assert "email" in start_data["data"]
    # NEVER expose verification code in response
    assert "code" not in start_data["data"]
    assert "verification_code" not in start_data["data"]
    assert "code_hash" not in start_data["data"]

    # Verify challenge in DB has code_hash, not plaintext code
    stmt = select(EmailVerificationChallenge).where(
        EmailVerificationChallenge.email == test_email.lower(),
        EmailVerificationChallenge.is_consumed == False
    )
    res = await db_session.execute(stmt)
    challenge = res.scalar_one()
    assert challenge is not None
    assert len(challenge.code_hash) == 64  # SHA-256 hash length

    # 2. Random 6-digit code MUST fail
    random_code = "999999"
    wrong_resp = await client.post(
        "/api/v1/auth/register/verify",
        json={"email": test_email, "code": random_code}
    )
    assert wrong_resp.status_code == 400
    assert "incorrecto" in wrong_resp.json()["error"]["message"].lower()

    # Find the real code from test ConsoleEmailAdapter
    adapter = get_email_adapter()
    assert isinstance(adapter, ConsoleEmailAdapter)
    sent_email = next(e for e in reversed(adapter.sent_emails) if e["to"] == test_email.lower())
    # Extract code from sent email text
    import re
    match = re.search(r"\b\d{6}\b", sent_email["text"])
    assert match is not None
    real_code = match.group(0)

    # 3. Submit real code -> MUST succeed
    verify_resp = await client.post(
        "/api/v1/auth/register/verify",
        json={"email": test_email, "code": real_code}
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()["data"]
    assert verify_data["verified"] is True
    assert "registration_token" in verify_data

    # 4. Attempting to reuse the code MUST fail (consumed)
    reuse_resp = await client.post(
        "/api/v1/auth/register/verify",
        json={"email": test_email, "code": real_code}
    )
    assert reuse_resp.status_code == 400

@pytest.mark.asyncio
async def test_duplicate_email_registration_returns_409(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Attempting to start or complete registration with an already-registered email
    MUST return 409 EMAIL_ALREADY_REGISTERED.
    """
    existing_email = f"owner_{uuid.uuid4().hex[:8]}@empresa.cr"

    # Create existing user in database
    existing_user = User(
        email=existing_email,
        password_hash=hash_password("ExistingPassword123!"),
        full_name="Existing Owner",
        role="owner",
        email_verified=True
    )
    db_session.add(existing_user)
    await db_session.commit()

    # Attempt to start registration with same email
    resp = await client.post(
        "/api/v1/auth/register/start",
        json={"email": existing_email}
    )
    assert resp.status_code == 409
    error_msg = resp.json()["error"]["message"]
    assert "EMAIL_ALREADY_REGISTERED" in error_msg

@pytest.mark.asyncio
async def test_atomic_registration_in_database(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Registration creates Organization, Owner User, Membership, Trial Subscription,
    and Onboarding record in ONE database transaction.
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"clean_owner_{unique_id}@orbitica.cr"

    payload = {
        "owner_full_name": "Valeria Monge",
        "owner_email": email,
        "owner_password": "SecurePassword123!",
        "owner_phone": "+506 8888-1234",
        "enable_2fa": True,
        "trade_name": "Boutique Florencia",
        "legal_name": "Inversiones Florencia del Sol S.A.",
        "identification_type": "02",
        "identification_number": f"3101{unique_id[:6]}",
        "country_code": "CR",
        "default_currency": "CRC"
    }

    reg_resp = await client.post("/api/v1/organizations/register", json=payload)
    assert reg_resp.status_code == 201
    org_data = reg_resp.json()["data"]
    org_id = uuid.UUID(org_data["id"])

    # 1. Organization persisted in DB
    org_stmt = select(Organization).where(Organization.id == org_id)
    org_res = await db_session.execute(org_stmt)
    org = org_res.scalar_one()
    assert org.trade_name == "Boutique Florencia"
    assert org.identification_number == f"3101{unique_id[:6]}"

    # 2. Owner User persisted in DB with Argon2id password hash
    u_stmt = select(User).where(User.normalized_email == email.lower())
    u_res = await db_session.execute(u_stmt)
    owner = u_res.scalar_one()
    assert owner.full_name == "Valeria Monge"
    assert owner.password_hash.startswith("$argon2id$")
    assert owner.email_2fa_enabled is True

    # 3. Organization Membership persisted in DB
    m_stmt = select(OrganizationMembership).where(
        OrganizationMembership.user_id == owner.id,
        OrganizationMembership.organization_id == org.id
    )
    m_res = await db_session.execute(m_stmt)
    membership = m_res.scalar_one()
    assert membership.role == "owner"

    # 4. Trial Subscription persisted in DB
    sub_stmt = select(Subscription).where(Subscription.organization_id == org.id)
    sub_res = await db_session.execute(sub_stmt)
    sub = sub_res.scalar_one()
    assert sub.plan_id == "TRIAL"
    assert sub.status == "ACTIVE"

    # 5. Onboarding record persisted in DB
    onb_stmt = select(OrganizationOnboarding).where(OrganizationOnboarding.organization_id == org.id)
    onb_res = await db_session.execute(onb_stmt)
    onboarding = onb_res.scalar_one()
    assert onboarding.current_step == 1
    assert onboarding.is_completed is False

@pytest.mark.asyncio
async def test_login_rejects_unknown_users_never_creates_accounts(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    CRITICAL SECURITY CHECK:
    Logging in with an unknown email MUST return 401 Unauthorized.
    It must NEVER invent or create an account in the database.
    """
    fake_email = f"nonexistent_{uuid.uuid4().hex[:8]}@orbitica.cr"

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": fake_email, "password": "AnyPassword123!"}
    )
    assert login_resp.status_code == 401

    # Confirm user was NOT created in DB
    stmt = select(User).where(User.normalized_email == fake_email.lower())
    res = await db_session.execute(stmt)
    assert res.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_2fa_login_flow(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Real 2FA Login Flow:
    1. User with 2FA logs in with correct password.
    2. Backend returns challenge_token and emails 6-digit OTP (NEVER in API response).
    3. Wrong OTP returns 401.
    4. Correct OTP logs in, returns access_token.
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"twofa_{unique_id}@orbitica.cr"
    password = "TwoFactorPassword123!"

    # Create user with 2FA enabled
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name="Roberto 2FA",
        role="owner",
        email_verified=True,
        email_2fa_enabled=True
    )
    db_session.add(user)
    await db_session.commit()

    # Step 1: Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()["data"]
    assert login_data["requires_2fa"] is True
    assert "challenge_token" in login_data
    challenge_token = login_data["challenge_token"]
    # NEVER expose OTP code in response
    assert "code" not in login_data
    assert "otp" not in login_data

    # Step 2: Wrong OTP fails with 401
    wrong_resp = await client.post(
        "/api/v1/auth/2fa/verify",
        json={"challenge_token": challenge_token, "code": "000000"}
    )
    assert wrong_resp.status_code == 401

    # Step 3: Get real OTP from console adapter
    adapter = get_email_adapter()
    sent = next(e for e in reversed(adapter.sent_emails) if e["to"] == email.lower())
    import re
    otp_code = re.search(r"\b\d{6}\b", sent["text"]).group(0)

    # Step 4: Correct OTP succeeds
    verify_resp = await client.post(
        "/api/v1/auth/2fa/verify",
        json={"challenge_token": challenge_token, "code": otp_code}
    )
    assert verify_resp.status_code == 200
    token_data = verify_resp.json()["data"]
    assert "access_token" in token_data

@pytest.mark.asyncio
async def test_existing_owner_creates_second_isolated_organization(
    client: AsyncClient,
    db_session: AsyncSession
):
    """
    Multi-Organization Support:
    An existing verified owner creates a second business:
    - Same User
    - Different Organization
    - Separate Membership
    - Completely isolated data
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"multi_{unique_id}@orbitica.cr"

    # Register initial organization
    reg_payload = {
        "owner_full_name": "Carlos Gomez",
        "owner_email": email,
        "owner_password": "MultiOrgPassword123!",
        "trade_name": "Panadería Don Carlos",
        "country_code": "CR",
        "default_currency": "CRC"
    }
    reg_resp = await client.post("/api/v1/organizations/register", json=reg_payload)
    assert reg_resp.status_code == 201
    org1_id = reg_resp.json()["data"]["id"]
    token = reg_resp.json()["data"]["access_token"]

    # Now create second business using authenticated endpoint
    headers = {"Authorization": f"Bearer {token}"}
    second_resp = await client.post(
        "/api/v1/organizations",
        headers=headers,
        json={
            "trade_name": "Cafetería Don Carlos",
            "default_currency": "CRC"
        }
    )
    assert second_resp.status_code == 201
    org2_id = second_resp.json()["data"]["id"]
    assert org1_id != org2_id

    # Verify only ONE user exists in DB for this email
    stmt = select(User).where(User.normalized_email == email.lower())
    res = await db_session.execute(stmt)
    users = list(res.scalars())
    assert len(users) == 1

    # Verify user has 2 memberships
    m_stmt = select(OrganizationMembership).where(OrganizationMembership.user_id == users[0].id)
    m_res = await db_session.execute(m_stmt)
    memberships = list(m_res.scalars())
    assert len(memberships) == 2
    org_ids = {str(m.organization_id) for m in memberships}
    assert org1_id in org_ids
    assert org2_id in org_ids
