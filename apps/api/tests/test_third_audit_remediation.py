import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient
import pyotp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.outbox import HaciendaOutbox
from app.models.idempotency import IdempotencyRecord
from app.models.user import User, UserSession
from app.services.idempotency_service import IdempotencyService
from app.services.auth_service import AuthService
from app.workers.hacienda_outbox_worker import HaciendaOutboxWorker
from app.core.exceptions import ConflictException, UnauthorizedException

@pytest.mark.asyncio
async def test_idempotency_service_behavior(client: AsyncClient, sample_organization, db_session: AsyncSession):
    # Login Owner
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get branch
    branches_resp = await client.get("/api/v1/branches", headers=headers)
    branch_id = branches_resp.json()["data"][0]["id"]

    # 2. Get tax rate and create product
    taxes = await client.get("/api/v1/tax-rates", headers=headers)
    tax_id = taxes.json()["data"][0]["id"]

    prod_resp = await client.post(
        "/api/v1/products",
        json={
            "name": "Pan Baguette Artesanal",
            "sku": "PAN-01",
            "barcode": "744100990011",
            "cabys_code": "2322000000000",
            "unit_of_measure": "Unid",
            "cost_price": 300,
            "sale_price": 500,
            "tax_rate_id": tax_id,
            "initial_stock": 50,
            "branch_id": branch_id
        },
        headers=headers
    )
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["data"]["id"]

    # 3. First Sale with Idempotency-Key
    sale_payload = {
        "branch_id": branch_id,
        "currency": "CRC",
        "items": [{"product_id": prod_id, "quantity": 1}],
        "payments": [{"payment_method": "CASH_CRC", "amount": 500}]
    }
    key = f"idem_key_{uuid.uuid4()}"
    headers_idem = {**headers, "Idempotency-Key": key}

    resp1 = await client.post("/api/v1/sales", json=sale_payload, headers=headers_idem)
    assert resp1.status_code == 201
    sale_id = resp1.json()["data"]["id"]

    # 4. Immediate identical replay -> Cache HIT
    resp2 = await client.post("/api/v1/sales", json=sale_payload, headers=headers_idem)
    assert resp2.status_code == 201
    assert resp2.headers.get("x-cache-lookup") == "HIT"
    assert resp2.json()["data"]["id"] == sale_id

    # 5. Same Idempotency-Key with different payload -> 409 Conflict
    diff_payload = {
        "branch_id": branch_id,
        "currency": "CRC",
        "items": [{"product_id": prod_id, "quantity": 5}],
        "payments": [{"payment_method": "CASH_CRC", "amount": 2500}]
    }
    resp3 = await client.post("/api/v1/sales", json=diff_payload, headers=headers_idem)
    assert resp3.status_code == 409
    assert "payload diferente" in resp3.json().get("detail", "").lower() or "conflicto" in resp3.json().get("detail", "").lower() or "diferente" in resp3.text

@pytest.mark.asyncio
async def test_refresh_token_family_reuse_revocation(client: AsyncClient, sample_organization, db_session: AsyncSession):
    # 1. Login user
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    assert login_resp.status_code == 200
    refresh_token_1 = login_resp.cookies.get("refresh_token")
    assert refresh_token_1 is not None

    # 2. Legitimate Refresh -> Generates refresh_token_2 and revokes refresh_token_1
    refresh_resp_1 = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_token_1}
    )
    assert refresh_resp_1.status_code == 200
    refresh_token_2 = refresh_resp_1.cookies.get("refresh_token")
    assert refresh_token_2 != refresh_token_1

    # 3. Attacker presents the already revoked refresh_token_1 (Token Reuse Attack)
    reuse_resp = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_token_1}
    )
    assert reuse_resp.status_code == 401
    assert "reutilización" in reuse_resp.text.lower() or "revocadas" in reuse_resp.text.lower()

    # 4. Now even the legitimate refresh_token_2 is also revoked because the entire family was terminated
    subsequent_resp = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_token_2}
    )
    assert subsequent_resp.status_code == 401

@pytest.mark.asyncio
async def test_mfa_totp_enrollment_and_activation(client: AsyncClient, sample_organization):
    # Login Owner
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Enroll MFA
    enroll_resp = await client.post("/api/v1/auth/mfa/enroll", headers=headers)
    assert enroll_resp.status_code == 200
    secret = enroll_resp.json()["data"]["secret"]
    assert "provisioning_uri" in enroll_resp.json()["data"]

    # 2. Activate with invalid code -> 401
    bad_act = await client.post(
        "/api/v1/auth/mfa/activate",
        json={"totp_code": "000000"},
        headers=headers
    )
    assert bad_act.status_code == 401

    # 3. Activate with valid generated code -> 200
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    good_act = await client.post(
        "/api/v1/auth/mfa/activate",
        json={"totp_code": valid_code},
        headers=headers
    )
    assert good_act.status_code == 200
    assert good_act.json()["data"]["activated"] is True

    # 4. Verify profile reflects totp_enabled = True
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["totp_enabled"] is True
