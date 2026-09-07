"""critical fiscal delivery and outbox constraints

Revision ID: 0005_final_production_fixes
Revises: 0004_quotes_system
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_final_production_fixes"
down_revision: Union[str, None] = "0004_quotes_system"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    duplicates = op.get_bind().execute(sa.text(
        "SELECT invoice_id FROM hacienda_outbox GROUP BY invoice_id HAVING COUNT(*) > 1 LIMIT 1"
    )).first()
    if duplicates:
        raise RuntimeError("Hay eventos fiscales duplicados: concilie el outbox antes de migrar; no borre el historial")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_normalized_email", type_="unique")
        batch_op.create_index("ix_users_normalized_email", ["normalized_email"], unique=True)
    op.create_index("ix_quotes_converted_sale_id", "quotes", ["converted_sale_id"])
    with op.batch_alter_table("electronic_invoices") as batch_op:
        batch_op.add_column(sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("email_retry_count", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("email_delivery_error", sa.Text(), nullable=True))

    # Fiscal snapshots must be explicit; silently defaulting to a fabricated
    # CAByS code can create invalid legal documents.
    with op.batch_alter_table("products") as batch_op:
        batch_op.alter_column("cabys_code", server_default=None)
    with op.batch_alter_table("sale_items") as batch_op:
        batch_op.alter_column("cabys_code", server_default=None)
        batch_op.add_column(sa.Column("is_service", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.alter_column("is_service", server_default=None)
        batch_op.add_column(sa.Column("price_includes_tax", sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.alter_column("price_includes_tax", server_default=None)
    op.execute(
        "UPDATE products SET is_active = false "
        "WHERE cabys_code IN ('0000000000000', '5211010000100')"
    )

    op.drop_index("ix_hacienda_outbox_invoice_id", table_name="hacienda_outbox")
    op.create_index(
        "ix_hacienda_outbox_invoice_id",
        "hacienda_outbox",
        ["invoice_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_quotes_converted_sale_id", table_name="quotes")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_normalized_email")
        batch_op.create_unique_constraint("uq_users_normalized_email", ["normalized_email"])
    op.drop_index("ix_hacienda_outbox_invoice_id", table_name="hacienda_outbox")
    op.create_index(
        "ix_hacienda_outbox_invoice_id",
        "hacienda_outbox",
        ["invoice_id"],
        unique=False,
    )
    with op.batch_alter_table("electronic_invoices") as batch_op:
        batch_op.drop_column("email_delivery_error")
        batch_op.drop_column("email_retry_count")
        batch_op.drop_column("email_sent_at")
    with op.batch_alter_table("sale_items") as batch_op:
        batch_op.drop_column("price_includes_tax")
        batch_op.drop_column("is_service")
        batch_op.alter_column("cabys_code", server_default="5211010000100")
    with op.batch_alter_table("products") as batch_op:
        batch_op.alter_column("cabys_code", server_default="5211010000100")
