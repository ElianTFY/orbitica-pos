"""Track credential verification and real fiscal worker liveness."""
from alembic import op
import sqlalchemy as sa

revision = "0008_fiscal_monitoring"
down_revision = "0007_explicit_fiscal_profile"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("fiscal_credentials", sa.Column("connection_tested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("fiscal_credentials", sa.Column("connection_test_success", sa.Boolean(), nullable=True))
    op.create_table(
        "fiscal_worker_heartbeats",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
    )
    op.create_index("ix_fiscal_worker_heartbeats_last_seen_at", "fiscal_worker_heartbeats", ["last_seen_at"])


def downgrade():
    op.drop_index("ix_fiscal_worker_heartbeats_last_seen_at", table_name="fiscal_worker_heartbeats")
    op.drop_table("fiscal_worker_heartbeats")
    op.drop_column("fiscal_credentials", "connection_test_success")
    op.drop_column("fiscal_credentials", "connection_tested_at")
