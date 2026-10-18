"""Remove fabricated fiscal defaults without rewriting existing issuer history.

Revision ID: 0007_explicit_fiscal_profile
Revises: 0006_cash_fiscal_integrity
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_explicit_fiscal_profile"
down_revision = "0006_cash_fiscal_integrity"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("organizations") as batch:
        for name in ("economic_activity_code", "province_code", "canton_code", "district_code", "neighborhood_code"):
            batch.alter_column(name, server_default=None)
        batch.alter_column("neighborhood_code", existing_type=sa.String(2), type_=sa.String(50))


def downgrade():
    # Keep explicit values and the wider neighborhood field: truncating saved
    # addresses or restoring fabricated fiscal defaults is not a safe rollback.
    pass
