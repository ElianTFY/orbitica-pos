"""initial_production_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-31 22:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import app.db.base

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Organizations
    op.create_table(
        'organizations',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('legal_name', sa.String(length=255), nullable=False),
        sa.Column('trade_name', sa.String(length=255), nullable=True),
        sa.Column('identification_type', sa.String(length=2), nullable=False),
        sa.Column('identification_number', sa.String(length=30), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone_country_code', sa.String(length=5), server_default='506', nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('country_code', sa.String(length=2), server_default='CR', nullable=False),
        sa.Column('economic_activity_code', sa.String(length=10), server_default='521101', nullable=False),
        sa.Column('province_code', sa.String(length=2), server_default='1', nullable=False),
        sa.Column('canton_code', sa.String(length=2), server_default='01', nullable=False),
        sa.Column('district_code', sa.String(length=2), server_default='01', nullable=False),
        sa.Column('neighborhood_code', sa.String(length=2), server_default='01', nullable=True),
        sa.Column('address_detail', sa.Text(), nullable=True),
        sa.Column('tax_regime', sa.String(length=30), server_default='TRADICIONAL', nullable=False),
        sa.Column('atv_environment', sa.String(length=20), server_default='STAGING', nullable=False),
        sa.Column('default_currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_identification_number'), 'organizations', ['identification_number'], unique=True)

    # 2. Branches
    op.create_table(
        'branches',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('code', sa.String(length=3), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_main', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_branches_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'code', name='uq_org_branch_code')
    )
    op.create_index(op.f('ix_branches_organization_id'), 'branches', ['organization_id'], unique=False)

    # 3. Users
    op.create_table(
        'users',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=30), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('totp_secret', sa.String(length=255), nullable=True),
        sa.Column('totp_enabled', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('recovery_token_hash', sa.String(length=255), nullable=True),
        sa.Column('recovery_token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_verified', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('email_verification_code', sa.String(length=10), nullable=True),
        sa.Column('email_verification_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_verification_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_users_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)
    op.create_index(op.f('ix_users_recovery_token_hash'), 'users', ['recovery_token_hash'], unique=False)

    # 4. User Branch Access
    op.create_table(
        'user_branch_access',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_user_branch_branch', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_user_branch_user', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'branch_id', name='uq_user_branch')
    )
    op.create_index(op.f('ix_user_branch_access_branch_id'), 'user_branch_access', ['branch_id'], unique=False)
    op.create_index(op.f('ix_user_branch_access_user_id'), 'user_branch_access', ['user_id'], unique=False)

    # 5. Categories
    op.create_table(
        'categories',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_categories_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_categories_organization_id'), 'categories', ['organization_id'], unique=False)

    # 6. Tax Rates
    op.create_table(
        'tax_rates',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code_cr', sa.String(length=2), nullable=False),
        sa.Column('rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_tax_rates_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tax_rates_organization_id'), 'tax_rates', ['organization_id'], unique=False)

    # 7. Products
    op.create_table(
        'products',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('category_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('tax_rate_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sku', sa.String(length=50), nullable=True),
        sa.Column('barcode', sa.String(length=50), nullable=True),
        sa.Column('cabys_code', sa.String(length=13), server_default='0000000000000', nullable=False),
        sa.Column('unit_of_measure', sa.String(length=10), server_default='Unid', nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cost_price', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('selling_price', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('is_inventory_tracked', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], name='fk_products_cat', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_products_org', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tax_rate_id'], ['tax_rates.id'], name='fk_products_tax', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_barcode'), 'products', ['barcode'], unique=False)
    op.create_index(op.f('ix_products_category_id'), 'products', ['category_id'], unique=False)
    op.create_index(op.f('ix_products_organization_id'), 'products', ['organization_id'], unique=False)
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=False)

    # 8. Inventory Levels
    op.create_table(
        'inventory_levels',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('current_stock', sa.Numeric(precision=12, scale=3), server_default='0.000', nullable=False),
        sa.Column('minimum_stock', sa.Numeric(precision=12, scale=3), server_default='0.000', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_inv_levels_branch', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_inv_levels_org', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_inv_levels_product', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_id', 'product_id', name='uq_branch_product_stock')
    )
    op.create_index(op.f('ix_inventory_levels_branch_id'), 'inventory_levels', ['branch_id'], unique=False)
    op.create_index(op.f('ix_inventory_levels_organization_id'), 'inventory_levels', ['organization_id'], unique=False)
    op.create_index(op.f('ix_inventory_levels_product_id'), 'inventory_levels', ['product_id'], unique=False)

    # 9. Inventory Transactions
    op.create_table(
        'inventory_transactions',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('transaction_type', sa.String(length=30), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column('stock_before', sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column('stock_after', sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_inv_tx_branch', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_inv_tx_org', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_inv_tx_product', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_inv_tx_user', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_transactions_branch_id'), 'inventory_transactions', ['branch_id'], unique=False)
    op.create_index(op.f('ix_inventory_transactions_organization_id'), 'inventory_transactions', ['organization_id'], unique=False)
    op.create_index(op.f('ix_inventory_transactions_product_id'), 'inventory_transactions', ['product_id'], unique=False)

    # 10. Cash Registers
    op.create_table(
        'cash_registers',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('pos_terminal_number', sa.String(length=5), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_cash_reg_branch', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_cash_reg_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'branch_id', 'pos_terminal_number', name='uq_org_branch_terminal')
    )
    op.create_index(op.f('ix_cash_registers_branch_id'), 'cash_registers', ['branch_id'], unique=False)
    op.create_index(op.f('ix_cash_registers_organization_id'), 'cash_registers', ['organization_id'], unique=False)

    # 11. Cash Register Sessions
    op.create_table(
        'cash_register_sessions',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('cash_register_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('opened_by_user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('closed_by_user_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('initial_cash_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('expected_cash_amount', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actual_cash_amount', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cash_difference', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='OPEN', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_cash_reg_sess_branch', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cash_register_id'], ['cash_registers.id'], name='fk_cash_reg_sess_register', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['closed_by_user_id'], ['users.id'], name='fk_cash_reg_sess_closed_user', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['opened_by_user_id'], ['users.id'], name='fk_cash_reg_sess_opened_user', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_cash_reg_sess_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cash_register_sessions_branch_id'), 'cash_register_sessions', ['branch_id'], unique=False)
    op.create_index(op.f('ix_cash_register_sessions_cash_register_id'), 'cash_register_sessions', ['cash_register_id'], unique=False)
    op.create_index(op.f('ix_cash_register_sessions_opened_by_user_id'), 'cash_register_sessions', ['opened_by_user_id'], unique=False)
    op.create_index(op.f('ix_cash_register_sessions_organization_id'), 'cash_register_sessions', ['organization_id'], unique=False)

    # 12. Customers
    op.create_table(
        'customers',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('identification_type', sa.String(length=2), nullable=True),
        sa.Column('identification_number', sa.String(length=30), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_customers_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customers_identification_number'), 'customers', ['identification_number'], unique=False)
    op.create_index(op.f('ix_customers_organization_id'), 'customers', ['organization_id'], unique=False)

    # 13. Sales
    op.create_table(
        'sales',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('cash_session_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('customer_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('sale_number', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='COMPLETED', nullable=False),
        sa.Column('doc_type', sa.String(length=20), server_default='TICKET', nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_sales_branch', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cash_session_id'], ['cash_register_sessions.id'], name='fk_sales_session', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], name='fk_sales_customer', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_sales_org', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_sales_user', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_branch_id'), 'sales', ['branch_id'], unique=False)
    op.create_index(op.f('ix_sales_cash_session_id'), 'sales', ['cash_session_id'], unique=False)
    op.create_index(op.f('ix_sales_customer_id'), 'sales', ['customer_id'], unique=False)
    op.create_index(op.f('ix_sales_organization_id'), 'sales', ['organization_id'], unique=False)
    op.create_index(op.f('ix_sales_sale_number'), 'sales', ['sale_number'], unique=False)
    op.create_index(op.f('ix_sales_user_id'), 'sales', ['user_id'], unique=False)

    # 14. Sale Items
    op.create_table(
        'sale_items',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_rate_percentage', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_sale_items_product', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], name='fk_sale_items_sale', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sale_items_product_id'), 'sale_items', ['product_id'], unique=False)
    op.create_index(op.f('ix_sale_items_sale_id'), 'sale_items', ['sale_id'], unique=False)

    # 15. Sale Payments
    op.create_table(
        'sale_payments',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('payment_method', sa.String(length=30), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], name='fk_sale_payments_sale', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sale_payments_sale_id'), 'sale_payments', ['sale_id'], unique=False)

    # 16. Electronic Invoices
    op.create_table(
        'electronic_invoices',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('branch_code', sa.String(length=3), server_default='001', nullable=False),
        sa.Column('terminal_number', sa.String(length=5), server_default='00001', nullable=False),
        sa.Column('doc_type', sa.String(length=2), nullable=False),
        sa.Column('numeric_key', sa.String(length=50), nullable=False),
        sa.Column('consecutive_number', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='DRAFT', nullable=False),
        sa.Column('environment', sa.String(length=20), server_default='STAGING', nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('receiver_tax_id_type', sa.String(length=2), nullable=True),
        sa.Column('receiver_tax_id', sa.String(length=30), nullable=True),
        sa.Column('receiver_name', sa.String(length=255), nullable=True),
        sa.Column('receiver_email', sa.String(length=255), nullable=True),
        sa.Column('reference_doc_type', sa.String(length=2), nullable=True),
        sa.Column('reference_numeric_key', sa.String(length=50), nullable=True),
        sa.Column('reference_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reference_code', sa.String(length=2), nullable=True),
        sa.Column('reference_reason', sa.String(length=255), nullable=True),
        sa.Column('xml_generated', sa.Text(), nullable=True),
        sa.Column('xml_signed', sa.Text(), nullable=True),
        sa.Column('hacienda_response_xml', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_el_invoices_org', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], name='fk_el_invoices_sale', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_electronic_invoices_consecutive_number'), 'electronic_invoices', ['consecutive_number'], unique=False)
    op.create_index(op.f('ix_electronic_invoices_numeric_key'), 'electronic_invoices', ['numeric_key'], unique=True)
    op.create_index(op.f('ix_electronic_invoices_organization_id'), 'electronic_invoices', ['organization_id'], unique=False)
    op.create_index(op.f('ix_electronic_invoices_sale_id'), 'electronic_invoices', ['sale_id'], unique=False)

    # 17. Consecutive Sequences
    op.create_table(
        'consecutive_sequences',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_code', sa.String(length=3), nullable=False),
        sa.Column('terminal_number', sa.String(length=5), nullable=False),
        sa.Column('doc_type', sa.String(length=2), nullable=False),
        sa.Column('environment', sa.String(length=20), nullable=False),
        sa.Column('current_value', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_consec_seq_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'branch_code', 'terminal_number', 'doc_type', 'environment', name='uq_consecutive_seq_org_branch_term_type_env')
    )
    op.create_index(op.f('ix_consecutive_sequences_organization_id'), 'consecutive_sequences', ['organization_id'], unique=False)

    # 18. Fiscal Credentials
    op.create_table(
        'fiscal_credentials',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('environment', sa.String(length=20), nullable=False),
        sa.Column('encrypted_p12', sa.Text(), nullable=True),
        sa.Column('encrypted_pin', sa.Text(), nullable=True),
        sa.Column('encrypted_atv_username', sa.Text(), nullable=True),
        sa.Column('encrypted_atv_password', sa.Text(), nullable=True),
        sa.Column('certificate_expiration', sa.DateTime(timezone=True), nullable=True),
        sa.Column('certificate_issuer', sa.String(length=255), nullable=True),
        sa.Column('certificate_subject', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_fiscal_cred_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'environment', name='uq_fiscal_cred_org_env')
    )
    op.create_index(op.f('ix_fiscal_credentials_organization_id'), 'fiscal_credentials', ['organization_id'], unique=False)

    # 19. Delegated Access Grants
    op.create_table(
        'delegated_access_grants',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('granted_by_user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('support_agent_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('permission_level', sa.String(length=30), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['granted_by_user_id'], ['users.id'], name='fk_del_grant_user', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_del_grant_org', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['support_agent_id'], ['users.id'], name='fk_del_grant_agent', ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delegated_access_grants_organization_id'), 'delegated_access_grants', ['organization_id'], unique=False)
    op.create_index(op.f('ix_delegated_access_grants_token_hash'), 'delegated_access_grants', ['token_hash'], unique=True)

    # 20. Support Tickets
    op.create_table(
        'support_tickets',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('created_by_user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('assigned_to_user_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('ticket_number', sa.String(length=20), nullable=False),
        sa.Column('category', sa.String(length=50), server_default='OTHER', nullable=False),
        sa.Column('priority', sa.String(length=20), server_default='NORMAL', nullable=False),
        sa.Column('status', sa.String(length=30), server_default='OPEN', nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('telemetry_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], name='fk_tck_assigned_user', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name='fk_tck_created_user', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_tck_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_tickets_organization_id'), 'support_tickets', ['organization_id'], unique=False)
    op.create_index(op.f('ix_support_tickets_ticket_number'), 'support_tickets', ['ticket_number'], unique=True)

    # 21. Support Messages
    op.create_table(
        'support_messages',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('ticket_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sender_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sender_type', sa.String(length=20), nullable=False),
        sa.Column('sender_name', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_internal_note', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], name='fk_msg_sender_user', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], name='fk_msg_ticket', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_messages_ticket_id'), 'support_messages', ['ticket_id'], unique=False)

    # 22. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('actor_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('request_id', sa.String(length=64), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('step_up_token', sa.String(length=255), nullable=True),
        sa.Column('payload_before', sa.JSON(), nullable=True),
        sa.Column('payload_after', sa.JSON(), nullable=True),
        sa.Column('previous_hash', sa.String(length=64), nullable=True),
        sa.Column('event_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name='fk_audit_actor', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name='fk_audit_branch', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='fk_audit_org', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_actor_id'), 'audit_logs', ['actor_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_branch_id'), 'audit_logs', ['branch_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_event_hash'), 'audit_logs', ['event_hash'], unique=False)
    op.create_index(op.f('ix_audit_logs_organization_id'), 'audit_logs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_resource'), 'audit_logs', ['resource'], unique=False)

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('support_messages')
    op.drop_table('support_tickets')
    op.drop_table('delegated_access_grants')
    op.drop_table('fiscal_credentials')
    op.drop_table('consecutive_sequences')
    op.drop_table('electronic_invoices')
    op.drop_table('sale_payments')
    op.drop_table('sale_items')
    op.drop_table('sales')
    op.drop_table('customers')
    op.drop_table('cash_register_sessions')
    op.drop_table('cash_registers')
    op.drop_table('inventory_transactions')
    op.drop_table('inventory_levels')
    op.drop_table('products')
    op.drop_table('tax_rates')
    op.drop_table('categories')
    op.drop_table('user_branch_access')
    op.drop_table('users')
    op.drop_table('branches')
    op.drop_table('organizations')
