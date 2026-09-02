import uuid
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.support import DelegatedAccessGrant
from app.models.audit_log import AuditLog
from app.core.constants import UserRole
from app.security.password import hash_password
from app.security.tokens import create_access_token
from app.services.support_service import SupportService

async def create_superadmin_helper(db: AsyncSession):
    sa_id = uuid.uuid4()
    sa = User(
        id=sa_id,
        email=f"superadmin_{sa_id.hex[:6]}@orbiticapos.com",
        password_hash=hash_password("SuperAdminSecret123!"),
        full_name="Super Administrador Global",
        role=UserRole.SUPERADMIN,
        is_active=True,
        organization_id=None
    )
    db.add(sa)
    await db.commit()
    token = create_access_token(subject=str(sa.id), claims={"role": sa.role.value})
    return sa, token

@pytest.mark.asyncio
async def test_superadmin_blocked_without_delegated_session(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Superadmin cannot operate on tenant resources without an explicit delegated session token.
    """
    _, superadmin_token = await create_superadmin_helper(db_session)

    resp = await client.get(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert resp.status_code == 403
    assert "sesión delegada" in str(resp.json()).lower()

@pytest.mark.asyncio
async def test_superadmin_access_with_valid_delegated_session(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Superadmin with a valid, time-bound delegated token accesses tenant resources,
    and mandatory audit logs are recorded.
    """
    sa, superadmin_token = await create_superadmin_helper(db_session)

    # 1. Organization owner issues a delegated grant for tech support
    service = SupportService(db_session)
    grant, raw_token = await service.create_delegated_access(
        organization_id=sample_organization.id,
        granted_by_user_id=uuid.uuid4(),
        reason="Revisión urgente de configuración de facturación fiscal",
        duration_minutes=30,
        permission_level="FULL"
    )

    # 2. Superadmin accesses tenant endpoint providing X-Delegated-Token
    resp = await client.get(
        "/api/v1/products",
        headers={
            "Authorization": f"Bearer {superadmin_token}",
            "X-Delegated-Token": raw_token
        }
    )
    assert resp.status_code == 200

    # 3. Verify mandatory audit trail recorded with superadmin_id, tenant_id, reason, and time limit
    audit_stmt = select(AuditLog).where(
        AuditLog.action == "DELEGATED_ACCESS_USED",
        AuditLog.actor_id == sa.id,
        AuditLog.organization_id == sample_organization.id
    )
    audit_res = await db_session.execute(audit_stmt)
    audit_log = audit_res.scalar_one_or_none()

    assert audit_log is not None
    assert "Revisión urgente" in audit_log.reason
    assert audit_log.payload_after is not None
    assert "expires_at" in audit_log.payload_after

@pytest.mark.asyncio
async def test_superadmin_blocked_with_expired_delegated_session(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Superadmin with an expired delegated token is strictly rejected.
    """
    _, superadmin_token = await create_superadmin_helper(db_session)

    service = SupportService(db_session)
    # Grant that already expired 10 minutes ago
    grant, raw_token = await service.create_delegated_access(
        organization_id=sample_organization.id,
        granted_by_user_id=uuid.uuid4(),
        reason="Sesión expirada de prueba",
        duration_minutes=-10,
        permission_level="READ_ONLY"
    )

    resp = await client.get(
        "/api/v1/products",
        headers={
            "Authorization": f"Bearer {superadmin_token}",
            "X-Delegated-Token": raw_token
        }
    )
    assert resp.status_code == 403
    assert "expirada" in str(resp.json()).lower()

@pytest.mark.asyncio
async def test_superadmin_blocked_with_revoked_delegated_session(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Superadmin with a revoked delegated token is rejected.
    """
    _, superadmin_token = await create_superadmin_helper(db_session)

    service = SupportService(db_session)
    grant, raw_token = await service.create_delegated_access(
        organization_id=sample_organization.id,
        granted_by_user_id=uuid.uuid4(),
        reason="Sesión revocada de prueba",
        duration_minutes=60
    )

    # Revoke grant
    grant.is_revoked = True
    grant.revoked_at = datetime.now(timezone.utc)
    grant.revoked_reason = "Revocación manual por seguridad"
    await db_session.commit()

    resp = await client.get(
        "/api/v1/products",
        headers={
            "Authorization": f"Bearer {superadmin_token}",
            "X-Delegated-Token": raw_token
        }
    )
    assert resp.status_code == 403
    assert "revocado" in str(resp.json()).lower()
