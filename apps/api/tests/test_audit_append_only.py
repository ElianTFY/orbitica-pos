import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from sqlalchemy.exc import DBAPIError, OperationalError
from app.models.organization import Organization
from app.models.audit_log import AuditLog
from app.services.audit_service import AuditService

@pytest.mark.asyncio
async def test_audit_log_creation_and_hash_chaining(
    db_session: AsyncSession,
    sample_organization: Organization
):
    """Verifies that audit logs are recorded and linked via SHA-256 hash chaining."""
    actor_id = uuid.uuid4()

    log1 = await AuditService.log_action(
        db=db_session,
        action="USER_LOGIN",
        resource="User",
        resource_id=str(actor_id),
        actor_id=actor_id,
        organization_id=sample_organization.id,
        reason="Inicio de sesión exitoso"
    )
    await db_session.commit()
    assert log1.id is not None
    assert log1.event_hash is not None

    log2 = await AuditService.log_action(
        db=db_session,
        action="INVOICE_ISSUED",
        resource="ElectronicInvoice",
        resource_id="50602092600310199988800100001010000000000111234567",
        actor_id=actor_id,
        organization_id=sample_organization.id,
        reason="Emisión de factura v4.4"
    )
    await db_session.commit()
    assert log2.previous_hash == log1.event_hash

    # Verify chain integrity
    is_valid, count, msg = await AuditService.verify_chain_integrity(db_session)
    assert is_valid is True
    assert count >= 2

@pytest.mark.asyncio
async def test_audit_log_orm_update_forbidden(
    db_session: AsyncSession,
    sample_organization: Organization
):
    """Verifies that updating an audit log record through the ORM raises PermissionError."""
    log = await AuditService.log_action(
        db=db_session,
        action="CONFIG_CHANGE",
        resource="Setting",
        organization_id=sample_organization.id,
        reason="Modificación de configuración"
    )
    await db_session.commit()

    # Attempt to tamper with the audit log via ORM
    log.action = "TAMPERED_ACTION"
    with pytest.raises(PermissionError) as exc_info:
        await db_session.commit()
    assert "append-only" in str(exc_info.value).lower()
    await db_session.rollback()

@pytest.mark.asyncio
async def test_audit_log_orm_delete_forbidden(
    db_session: AsyncSession,
    sample_organization: Organization
):
    """Verifies that deleting an audit log record through the ORM raises PermissionError."""
    log = await AuditService.log_action(
        db=db_session,
        action="DATA_EXPORT",
        resource="Report",
        organization_id=sample_organization.id
    )
    await db_session.commit()

    # Attempt to delete the audit log via ORM
    await db_session.delete(log)
    with pytest.raises(PermissionError) as exc_info:
        await db_session.commit()
    assert "append-only" in str(exc_info.value).lower()
    await db_session.rollback()

@pytest.mark.asyncio
async def test_audit_log_database_level_update_and_delete_triggers(
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Verifies that direct SQL UPDATE or DELETE queries bypassing the ORM
    are strictly rejected by the database-level triggers.
    """
    # Ensure database trigger exists on the test connection
    dialect = db_session.bind.dialect.name
    if dialect == "sqlite":
        await db_session.execute(text("""
        CREATE TRIGGER IF NOT EXISTS trg_test_block_audit_update
        BEFORE UPDATE ON audit_logs
        BEGIN
            SELECT RAISE(FAIL, 'AuditLog is append-only. UPDATE operations are strictly prohibited.');
        END;
        """))
        await db_session.execute(text("""
        CREATE TRIGGER IF NOT EXISTS trg_test_block_audit_delete
        BEFORE DELETE ON audit_logs
        BEGIN
            SELECT RAISE(FAIL, 'AuditLog is append-only. DELETE operations are strictly prohibited.');
        END;
        """))
        await db_session.commit()

    log = await AuditService.log_action(
        db=db_session,
        action="SECURE_TRANSACTION",
        resource="Sale",
        organization_id=sample_organization.id
    )
    await db_session.commit()
    log_id = str(log.id).replace("-", "")

    # 1. Attempt raw SQL UPDATE
    with pytest.raises((DBAPIError, OperationalError, PermissionError)) as exc_update:
        await db_session.execute(text("UPDATE audit_logs SET action = 'HACKED'"))
        await db_session.commit()
    assert "append-only" in str(exc_update.value).lower() or "prohibited" in str(exc_update.value).lower()
    await db_session.rollback()

    # 2. Attempt raw SQL DELETE
    with pytest.raises((DBAPIError, OperationalError, PermissionError)) as exc_delete:
        await db_session.execute(text("DELETE FROM audit_logs"))
        await db_session.commit()
    assert "append-only" in str(exc_delete.value).lower() or "prohibited" in str(exc_delete.value).lower()
    await db_session.rollback()
