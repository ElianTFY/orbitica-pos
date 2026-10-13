"""Cash drawer integrity and immutable fiscal inputs.

Revision ID: 0006_cash_fiscal_integrity
Revises: 0005_final_production_fixes
"""
from alembic import op
import sqlalchemy as sa
from app.db.base import GUID

revision = '0006_cash_fiscal_integrity'
down_revision = '0005_final_production_fixes'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    for columns in ('cash_register_id', 'organization_id, opened_by_user_id'):
        if connection.execute(sa.text(
            f"SELECT {columns} FROM cash_register_sessions WHERE status = 'OPEN' GROUP BY {columns} HAVING COUNT(*) > 1 LIMIT 1"
        )).first():
            raise RuntimeError('Concilie los turnos abiertos duplicados antes de migrar; no se modifica su historial')
    op.add_column('hacienda_outbox', sa.Column('transmission_attempted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('electronic_invoices', sa.Column('fiscal_snapshot', sa.JSON(), nullable=True))
    op.add_column('electronic_invoices', sa.Column('email_next_retry_at', sa.DateTime(timezone=True), nullable=True))
    with op.batch_alter_table('cash_movements') as batch:
        batch.add_column(sa.Column('reference_sale_id', GUID(), nullable=True))
        batch.create_foreign_key('fk_cash_movement_refund_sale', 'sales', ['reference_sale_id'], ['id'], ondelete='RESTRICT')
        batch.create_unique_constraint('uq_cash_refund_sale', ['reference_sale_id'])
    for name, columns in [('uq_open_cash_register', ['cash_register_id']),
                           ('uq_open_cash_operator', ['organization_id', 'opened_by_user_id'])]:
        op.create_index(name, 'cash_register_sessions', columns, unique=True,
                        postgresql_where=sa.text("status = 'OPEN'"), sqlite_where=sa.text("status = 'OPEN'"))


def downgrade():
    op.drop_column("hacienda_outbox", "transmission_attempted_at")
    for name in ('uq_open_cash_register', 'uq_open_cash_operator'):
        op.drop_index(name, table_name='cash_register_sessions')
    with op.batch_alter_table('cash_movements') as batch:
        batch.drop_constraint('uq_cash_refund_sale', type_='unique')
        batch.drop_constraint('fk_cash_movement_refund_sale', type_='foreignkey')
        batch.drop_column('reference_sale_id')
    op.drop_column('electronic_invoices', 'email_next_retry_at')
    op.drop_column('electronic_invoices', 'fiscal_snapshot')
