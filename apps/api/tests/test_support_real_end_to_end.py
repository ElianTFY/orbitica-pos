import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.models.organization import Organization
from app.models.user import User
from app.security.password import hash_password
from app.security.tokens import create_access_token


def token_for(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        claims={"org_id": str(user.organization_id) if user.organization_id else None, "role": user.role},
    )


@pytest.mark.asyncio
async def test_support_and_delegated_access_are_server_backed(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization,
    superadmin_user: User,
):
    owner = (await db_session.execute(
        select(User).where(
            User.organization_id == sample_organization.id,
            User.role == UserRole.OWNER,
        )
    )).scalar_one()
    owner_headers = {"Authorization": f"Bearer {token_for(owner)}"}
    admin_headers = {"Authorization": f"Bearer {token_for(superadmin_user)}"}

    created = await client.post(
        "/api/v1/support/tickets",
        headers=owner_headers,
        json={
            "subject": "Error de validación fiscal",
            "description": "La factura de prueba permanece pendiente en Hacienda.",
            "category": "HACIENDA",
            "priority": "HIGH",
            "telemetry": {"app_version": "test"},
        },
    )
    assert created.status_code == 201, created.text
    ticket = created.json()["data"]
    assert ticket["organization_id"] == str(sample_organization.id)
    assert ticket["organization_name"] == sample_organization.trade_name

    detail = await client.get(f"/api/v1/support/tickets/{ticket['id']}", headers=owner_headers)
    assert detail.status_code == 200
    assert len(detail.json()["data"]["messages"]) == 1

    reply = await client.post(
        f"/api/v1/support/tickets/{ticket['id']}/messages",
        headers=admin_headers,
        json={"message": "Estamos revisando el comprobante.", "is_internal_note": False},
    )
    assert reply.status_code == 200

    status_change = await client.patch(
        f"/api/v1/support/tickets/{ticket['id']}/status",
        headers=admin_headers,
        json={"status": "WAITING_CLIENT", "reason": "Se requiere confirmación del comercio"},
    )
    assert status_change.status_code == 200
    assert status_change.json()["data"]["status"] == "WAITING_CLIENT"

    granted = await client.post(
        "/api/v1/support/delegated-access",
        headers=owner_headers,
        json={
            "reason": "Diagnóstico fiscal autorizado por el propietario",
            "duration_minutes": 30,
            "permission_level": "READ_ONLY",
        },
    )
    assert granted.status_code == 200
    grant = granted.json()["data"]
    assert grant["delegated_token"]

    read_only_mutation = await client.patch(
        "/api/v1/organizations/me",
        headers={
            **admin_headers,
            "X-Delegated-Token": grant["delegated_token"],
        },
        json={"trade_name": "Cambio no autorizado"},
    )
    assert read_only_mutation.status_code == 403
    assert "solo lectura" in read_only_mutation.json()["error"]["message"].lower()

    second_admin = User(
        email="other-superadmin@orbitica.cr",
        password_hash=hash_password("OtherAdminPassword123!"),
        full_name="Otro Superadmin",
        role=UserRole.SUPERADMIN,
        organization_id=None,
    )
    db_session.add(second_admin)
    await db_session.commit()
    bound_token_reuse = await client.get(
        "/api/v1/organizations/me",
        headers={
            "Authorization": f"Bearer {token_for(second_admin)}",
            "X-Delegated-Token": grant["delegated_token"],
        },
    )
    assert bound_token_reuse.status_code == 403
    assert "otro agente" in bound_token_reuse.json()["error"]["message"].lower()

    active = await client.get("/api/v1/support/delegated-access/active", headers=owner_headers)
    assert active.status_code == 200
    assert active.json()["data"]["grant_id"] == grant["grant_id"]
    assert "delegated_token" not in active.json()["data"]

    admin_grants = await client.get("/api/v1/support/admin/delegated-access", headers=admin_headers)
    assert admin_grants.status_code == 200
    assert admin_grants.json()["data"][0]["grant_id"] == grant["grant_id"]
    assert "delegated_token" not in admin_grants.json()["data"][0]

    revoked = await client.request(
        "DELETE",
        f"/api/v1/support/admin/delegated-access/{grant['grant_id']}",
        headers=admin_headers,
        json={"reason": "Cierre seguro de la sesión de diagnóstico"},
    )
    assert revoked.status_code == 200
    assert revoked.json()["data"]["is_revoked"] is True


@pytest.mark.asyncio
async def test_full_admin_delegation_requires_step_up_and_new_grant_revokes_previous(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization,
    superadmin_user: User,
):
    owner = (await db_session.execute(
        select(User).where(
            User.organization_id == sample_organization.id,
            User.role == UserRole.OWNER,
        )
    )).scalar_one()
    owner_headers = {"Authorization": f"Bearer {token_for(owner)}"}
    payload = {
        "reason": "Asistencia administrativa autorizada por el propietario",
        "duration_minutes": 30,
        "permission_level": "FULL_ADMIN",
    }

    denied = await client.post(
        "/api/v1/support/delegated-access",
        headers=owner_headers,
        json=payload,
    )
    assert denied.status_code == 403

    action = "Conceder acceso delegado de administrador"
    resource = f"Tenant #{sample_organization.id}"
    step_up = await client.post(
        "/api/v1/auth/step-up",
        headers=owner_headers,
        json={
            "password": "OwnerPassword123!",
            "action": action,
            "target_resource": resource,
            "reason": payload["reason"],
        },
    )
    assert step_up.status_code == 200, step_up.text

    full_admin = await client.post(
        "/api/v1/support/delegated-access",
        headers={
            **owner_headers,
            "X-Step-Up-Token": step_up.json()["data"]["step_up_token"],
        },
        json=payload,
    )
    assert full_admin.status_code == 200, full_admin.text
    full_admin_token = full_admin.json()["data"]["delegated_token"]

    replacement = await client.post(
        "/api/v1/support/delegated-access",
        headers=owner_headers,
        json={
            "reason": "Nueva sesión restringida para diagnóstico",
            "duration_minutes": 15,
            "permission_level": "READ_ONLY",
        },
    )
    assert replacement.status_code == 200

    revoked_token = await client.get(
        "/api/v1/organizations/me",
        headers={
            "Authorization": f"Bearer {token_for(superadmin_user)}",
            "X-Delegated-Token": full_admin_token,
        },
    )
    assert revoked_token.status_code == 403
    assert "revocado" in revoked_token.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_cashier_cannot_grant_delegated_admin_access(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization,
):
    cashier = User(
        organization_id=sample_organization.id,
        email="cashier-support-test@elsol.cr",
        password_hash=hash_password("CashierPassword123!"),
        full_name="Caja Sin Permiso",
        role=UserRole.CASHIER,
    )
    db_session.add(cashier)
    await db_session.commit()

    response = await client.post(
        "/api/v1/support/delegated-access",
        headers={"Authorization": f"Bearer {token_for(cashier)}"},
        json={
            "reason": "Intento de escalar privilegios de soporte",
            "duration_minutes": 60,
            "permission_level": "FULL_ADMIN",
        },
    )
    assert response.status_code == 403
