"""quotes system

Revision ID: 0004_quotes_system
Revises: 0003_auth_challenges_memberships_onboarding
Create Date: 2026-09-03 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import app.db.base

revision: str = "0004_quotes_system"
down_revision: Union[str, None] = "0003_auth_challenges_memberships_onboarding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'quotes',
        sa.Column('id', app.db.base.GUID(), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(), nullable=False),
        sa.Column('customer_id', app.db.base.GUID(), nullable=True),
        sa.Column('user_id', app.db.base.GUID(), nullable=False),
        sa.Column('quote_number', sa.String(length=50), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('status', sa.String(length=30), server_default='DRAFT', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('converted_sale_id', app.db.base.GUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['converted_sale_id'], ['sales.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_quotes_organization_id', 'quotes', ['organization_id'])
    op.create_index('ix_quotes_branch_id', 'quotes', ['branch_id'])
    op.create_index('ix_quotes_customer_id', 'quotes', ['customer_id'])
    op.create_index('ix_quotes_user_id', 'quotes', ['user_id'])
    op.create_index('ix_quotes_quote_number', 'quotes', ['quote_number'])

    op.create_table(
        'quote_items',
        sa.Column('id', app.db.base.GUID(), nullable=False),
        sa.Column('quote_id', app.db.base.GUID(), nullable=False),
        sa.Column('product_id', app.db.base.GUID(), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('discount_percentage', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), server_default='13.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('line_total', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_quote_items_quote_id', 'quote_items', ['quote_id'])


def downgrade() -> None:
    op.drop_table('quote_items')
    op.drop_table('quotes')
