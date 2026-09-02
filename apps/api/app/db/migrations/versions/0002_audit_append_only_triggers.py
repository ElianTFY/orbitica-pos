"""audit append-only triggers

Revision ID: 0002_audit_append_only
Revises: 0001_initial_production_schema
Create Date: 2026-09-02 12:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_audit_append_only"
down_revision: Union[str, None] = "0001_initial_production_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("""
        CREATE OR REPLACE FUNCTION block_audit_log_modifications()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'AuditLog is append-only. UPDATE and DELETE operations are strictly prohibited by compliance policy.';
        END;
        $$ LANGUAGE plpgsql;
        """)

        op.execute("""
        DROP TRIGGER IF EXISTS trg_block_audit_log_modifications ON audit_logs;
        CREATE TRIGGER trg_block_audit_log_modifications
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION block_audit_log_modifications();
        """)
    elif bind.dialect.name == "sqlite":
        op.execute("""
        CREATE TRIGGER IF NOT EXISTS trg_block_audit_log_update
        BEFORE UPDATE ON audit_logs
        BEGIN
            SELECT RAISE(FAIL, 'AuditLog is append-only. UPDATE operations are strictly prohibited.');
        END;
        """)
        op.execute("""
        CREATE TRIGGER IF NOT EXISTS trg_block_audit_log_delete
        BEFORE DELETE ON audit_logs
        BEGIN
            SELECT RAISE(FAIL, 'AuditLog is append-only. DELETE operations are strictly prohibited.');
        END;
        """)

def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_block_audit_log_modifications ON audit_logs;")
        op.execute("DROP FUNCTION IF EXISTS block_audit_log_modifications();")
    elif bind.dialect.name == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS trg_block_audit_log_update;")
        op.execute("DROP TRIGGER IF EXISTS trg_block_audit_log_delete;")
