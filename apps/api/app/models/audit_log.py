import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, JSON, event, DDL
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, GUID

class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Audit Security & Forensic Hashing
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    step_up_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    payload_before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    payload_after: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    # Chained Cryptographic Verification (SHA-256)
    previous_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

# ==============================================================================
# Database-Level Immutability Triggers (Append-Only Enforcement)
# ==============================================================================

# PostgreSQL Trigger: Blocks any UPDATE or DELETE at the database engine level
pg_trigger_func = DDL("""
CREATE OR REPLACE FUNCTION block_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AuditLog is append-only. UPDATE and DELETE operations are strictly prohibited by compliance policy.';
END;
$$ LANGUAGE plpgsql;
""")

pg_trigger_create = DDL("""
DROP TRIGGER IF EXISTS trg_block_audit_log_modifications ON audit_logs;
CREATE TRIGGER trg_block_audit_log_modifications
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION block_audit_log_modifications();
""")

event.listen(AuditLog.__table__, "after_create", pg_trigger_func.execute_if(dialect="postgresql"))
event.listen(AuditLog.__table__, "after_create", pg_trigger_create.execute_if(dialect="postgresql"))

# SQLite Triggers: Blocks any UPDATE or DELETE at the engine level for local dev & unit tests
sqlite_trg_update = DDL("""
CREATE TRIGGER IF NOT EXISTS trg_block_audit_log_update
BEFORE UPDATE ON audit_logs
BEGIN
    SELECT RAISE(FAIL, 'AuditLog is append-only. UPDATE operations are strictly prohibited.');
END;
""")

sqlite_trg_delete = DDL("""
CREATE TRIGGER IF NOT EXISTS trg_block_audit_log_delete
BEFORE DELETE ON audit_logs
BEGIN
    SELECT RAISE(FAIL, 'AuditLog is append-only. DELETE operations are strictly prohibited.');
END;
""")

event.listen(AuditLog.__table__, "after_create", sqlite_trg_update.execute_if(dialect="sqlite"))
event.listen(AuditLog.__table__, "after_create", sqlite_trg_delete.execute_if(dialect="sqlite"))

# ==============================================================================
# ORM-Level Immutability Hooks
# ==============================================================================

@event.listens_for(AuditLog, "before_update", propagate=True)
def prevent_audit_log_orm_update(mapper, connection, target):
    raise PermissionError("AuditLog records are append-only. UPDATE operations are strictly forbidden.")

@event.listens_for(AuditLog, "before_delete", propagate=True)
def prevent_audit_log_orm_delete(mapper, connection, target):
    raise PermissionError("AuditLog records are append-only. DELETE operations are strictly forbidden.")
