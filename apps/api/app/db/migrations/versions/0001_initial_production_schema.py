"""initial_production_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-31 23:00:00.000000

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
        sa.Column('trade_name', sa.String(length=255), nullable=False),
        sa.Column('identification_type', sa.String(length=20), nullable=False),
        sa.Column('identification_number', sa.String(length=30), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('country_code', sa.String(length=2), server_default='CR', nullable=False),
        sa.Column('default_currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('economic_activity_code', sa.String(length=10), server_default='521101', nullable=False),
        sa.Column('province_code', sa.String(length=2), server_default='1', nullable=False),
        sa.Column('canton_code', sa.String(length=2), server_default='01', nullable=False),
        sa.Column('district_code', sa.String(length=2), server_default='01', nullable=False),
        sa.Column('neighborhood_code', sa.String(length=2), server_default='01', nullable=True),
        sa.Column('address_detail', sa.Text(), nullable=True),
        sa.Column('tax_regime', sa.String(length=30), server_default='TRADICIONAL', nullable=False),
        sa.Column('atv_environment', sa.String(length=20), server_default='STAGING', nullable=False),
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
        sa.Column('code', sa.String(length=10), server_default='001', nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('is_main', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
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
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)
    op.create_index(op.f('ix_users_recovery_token_hash'), 'users', ['recovery_token_hash'], unique=False)

    # 4. User Branch Accesses
    op.create_table(
        'user_branch_access',
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'branch_id')
    )

    # 5. User Sessions
    op.create_table(
        'user_sessions',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('family_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('parent_token_hash', sa.String(length=255), nullable=True),
        sa.Column('refresh_token_hash', sa.String(length=255), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_sessions_user_id'), 'user_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_sessions_family_id'), 'user_sessions', ['family_id'], unique=False)
    op.create_index(op.f('ix_user_sessions_refresh_token_hash'), 'user_sessions', ['refresh_token_hash'], unique=True)

    # 6. Cash Registers
    op.create_table(
        'cash_registers',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('pos_terminal_number', sa.String(length=5), server_default='00001', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'branch_id', 'pos_terminal_number', name='uq_org_branch_terminal')
    )
    op.create_index(op.f('ix_cash_registers_organization_id'), 'cash_registers', ['organization_id'], unique=False)
    op.create_index(op.f('ix_cash_registers_branch_id'), 'cash_registers', ['branch_id'], unique=False)

    # 7. Cash Register Sessions
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
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='OPEN', nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cash_register_id'], ['cash_registers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['closed_by_user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['opened_by_user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cash_register_sessions_organization_id'), 'cash_register_sessions', ['organization_id'], unique=False)
    op.create_index(op.f('ix_cash_register_sessions_branch_id'), 'cash_register_sessions', ['branch_id'], unique=False)
    op.create_index(op.f('ix_cash_register_sessions_cash_register_id'), 'cash_register_sessions', ['cash_register_id'], unique=False)
    op.create_index(op.f('ix_cash_register_sessions_opened_by_user_id'), 'cash_register_sessions', ['opened_by_user_id'], unique=False)

    # 8. Cash Movements
    op.create_table(
        'cash_movements',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('cash_session_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('movement_type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cash_session_id'], ['cash_register_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cash_movements_organization_id'), 'cash_movements', ['organization_id'], unique=False)
    op.create_index(op.f('ix_cash_movements_branch_id'), 'cash_movements', ['branch_id'], unique=False)
    op.create_index(op.f('ix_cash_movements_cash_session_id'), 'cash_movements', ['cash_session_id'], unique=False)

    # 9. Categories
    op.create_table(
        'categories',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'name', name='uq_org_category_name')
    )
    op.create_index(op.f('ix_categories_organization_id'), 'categories', ['organization_id'], unique=False)

    # 10. Tax Rates
    op.create_table(
        'tax_rates',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code_cr', sa.String(length=10), server_default='01', nullable=False),
        sa.Column('rate', sa.Numeric(precision=5, scale=2), server_default='13.00', nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tax_rates_organization_id'), 'tax_rates', ['organization_id'], unique=False)

    # 11. Products
    op.create_table(
        'products',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('category_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('tax_rate_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('barcode', sa.String(length=100), nullable=True),
        sa.Column('cabys_code', sa.String(length=13), server_default='5211010000100', nullable=False),
        sa.Column('unit_of_measure', sa.String(length=10), server_default='Unid', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cost_price', sa.Numeric(precision=14, scale=4), server_default='0.0000', nullable=False),
        sa.Column('sale_price', sa.Numeric(precision=14, scale=4), server_default='0.0000', nullable=False),
        sa.Column('min_stock_alert', sa.Numeric(precision=10, scale=2), server_default='5.00', nullable=False),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('is_service', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tax_rate_id'], ['tax_rates.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'barcode', name='uq_org_barcode'),
        sa.UniqueConstraint('organization_id', 'sku', name='uq_org_sku')
    )
    op.create_index(op.f('ix_products_organization_id'), 'products', ['organization_id'], unique=False)
    op.create_index(op.f('ix_products_barcode'), 'products', ['barcode'], unique=False)
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=False)

    # 12. Branch Product Stocks
    op.create_table(
        'branch_product_stocks',
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('branch_id', 'product_id')
    )

    # 13. Inventory Movements
    op.create_table(
        'inventory_movements',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('actor_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('movement_type', sa.String(length=30), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('previous_quantity', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('new_quantity', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('reference_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_movements_organization_id'), 'inventory_movements', ['organization_id'], unique=False)
    op.create_index(op.f('ix_inventory_movements_branch_id'), 'inventory_movements', ['branch_id'], unique=False)
    op.create_index(op.f('ix_inventory_movements_product_id'), 'inventory_movements', ['product_id'], unique=False)
    op.create_index(op.f('ix_inventory_movements_created_at'), 'inventory_movements', ['created_at'], unique=False)

    # 14. Customers
    op.create_table(
        'customers',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('identification_type', sa.String(length=20), server_default='FISICA', nullable=False),
        sa.Column('identification_number', sa.String(length=30), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customers_organization_id'), 'customers', ['organization_id'], unique=False)
    op.create_index(op.f('ix_customers_identification_number'), 'customers', ['identification_number'], unique=False)

    # 15. Suppliers
    op.create_table(
        'suppliers',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('identification_type', sa.String(length=20), server_default='02', nullable=False),
        sa.Column('identification_number', sa.String(length=30), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('trade_name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'identification_number', name='uq_org_supplier_ident')
    )
    op.create_index(op.f('ix_suppliers_organization_id'), 'suppliers', ['organization_id'], unique=False)
    op.create_index(op.f('ix_suppliers_identification_number'), 'suppliers', ['identification_number'], unique=False)

    # 16. Purchases
    op.create_table(
        'purchases',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('supplier_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('purchase_number', sa.String(length=50), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=True),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='COMPLETED', nullable=False),
        sa.Column('payment_method', sa.String(length=30), server_default='TRANSFER', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'branch_id', 'purchase_number', name='uq_org_branch_purchase_num')
    )
    op.create_index(op.f('ix_purchases_organization_id'), 'purchases', ['organization_id'], unique=False)
    op.create_index(op.f('ix_purchases_branch_id'), 'purchases', ['branch_id'], unique=False)
    op.create_index(op.f('ix_purchases_supplier_id'), 'purchases', ['supplier_id'], unique=False)
    op.create_index(op.f('ix_purchases_created_at'), 'purchases', ['created_at'], unique=False)

    # 17. Purchase Items
    op.create_table(
        'purchase_items',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('purchase_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('product_sku', sa.String(length=100), nullable=True),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit_cost', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), server_default='13.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('line_total', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_items_purchase_id'), 'purchase_items', ['purchase_id'], unique=False)
    op.create_index(op.f('ix_purchase_items_product_id'), 'purchase_items', ['product_id'], unique=False)

    # 18. Sales
    op.create_table(
        'sales',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('cash_session_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('customer_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_number', sa.String(length=50), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='COMPLETED', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cash_session_id'], ['cash_register_sessions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'branch_id', 'sale_number', name='uq_org_branch_sale_number')
    )
    op.create_index(op.f('ix_sales_organization_id'), 'sales', ['organization_id'], unique=False)
    op.create_index(op.f('ix_sales_branch_id'), 'sales', ['branch_id'], unique=False)
    op.create_index(op.f('ix_sales_created_at'), 'sales', ['created_at'], unique=False)

    # 19. Sale Items
    op.create_table(
        'sale_items',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('product_sku', sa.String(length=100), nullable=True),
        sa.Column('cabys_code', sa.String(length=13), server_default='5211010000100', nullable=False),
        sa.Column('unit_of_measure', sa.String(length=10), server_default='Unid', nullable=False),
        sa.Column('tax_rate_code', sa.String(length=2), server_default='08', nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('unit_cost', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('discount_percentage', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), server_default='13.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('line_total', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sale_items_sale_id'), 'sale_items', ['sale_id'], unique=False)

    # 20. Sale Payments
    op.create_table(
        'sale_payments',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('payment_method', sa.String(length=30), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('change_returned', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sale_payments_sale_id'), 'sale_payments', ['sale_id'], unique=False)

    # 21. Consecutive Sequences
    op.create_table(
        'consecutive_sequences',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_code', sa.String(length=3), nullable=False),
        sa.Column('terminal_number', sa.String(length=5), nullable=False),
        sa.Column('doc_type', sa.String(length=2), nullable=False),
        sa.Column('environment', sa.String(length=20), nullable=False),
        sa.Column('current_value', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'branch_code', 'terminal_number', 'doc_type', 'environment', name='uq_consecutive_seq_org_branch_term_type_env')
    )
    op.create_index(op.f('ix_consecutive_sequences_organization_id'), 'consecutive_sequences', ['organization_id'], unique=False)

    # 22. Fiscal Credentials
    op.create_table(
        'fiscal_credentials',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('environment', sa.String(length=20), server_default='STAGING', nullable=False),
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
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'environment', name='uq_fiscal_cred_org_env')
    )
    op.create_index(op.f('ix_fiscal_credentials_organization_id'), 'fiscal_credentials', ['organization_id'], unique=False)

    # 23. Electronic Invoices
    op.create_table(
        'electronic_invoices',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('sale_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('doc_type', sa.String(length=2), nullable=False),
        sa.Column('numeric_key', sa.String(length=50), nullable=False),
        sa.Column('consecutive_number', sa.String(length=20), nullable=False),
        sa.Column('environment', sa.String(length=20), server_default='STAGING', nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('exchange_rate', sa.Numeric(precision=10, scale=4), server_default='1.0000', nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('status', sa.String(length=30), server_default='DRAFT', nullable=False),
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
        sa.Column('hacienda_status_code', sa.String(length=10), nullable=True),
        sa.Column('hacienda_error_message', sa.Text(), nullable=True),
        sa.Column('sent_to_hacienda_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('hacienda_processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_electronic_invoices_numeric_key'), 'electronic_invoices', ['numeric_key'], unique=True)
    op.create_index(op.f('ix_electronic_invoices_organization_id'), 'electronic_invoices', ['organization_id'], unique=False)
    op.create_index(op.f('ix_electronic_invoices_branch_id'), 'electronic_invoices', ['branch_id'], unique=False)
    op.create_index(op.f('ix_electronic_invoices_sale_id'), 'electronic_invoices', ['sale_id'], unique=False)

    # 24. Hacienda Outbox
    op.create_table(
        'hacienda_outbox',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('branch_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('invoice_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('numeric_key', sa.String(length=50), nullable=False),
        sa.Column('consecutive_number', sa.String(length=20), nullable=False),
        sa.Column('doc_type', sa.String(length=2), nullable=False),
        sa.Column('xml_uncompressed', sa.Text(), nullable=False),
        sa.Column('xml_signed', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='QUEUED', nullable=False),
        sa.Column('retry_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('next_retry_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('hacienda_response_code', sa.Integer(), nullable=True),
        sa.Column('hacienda_response_xml', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invoice_id'], ['electronic_invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hacienda_outbox_organization_id'), 'hacienda_outbox', ['organization_id'], unique=False)
    op.create_index(op.f('ix_hacienda_outbox_branch_id'), 'hacienda_outbox', ['branch_id'], unique=False)
    op.create_index(op.f('ix_hacienda_outbox_invoice_id'), 'hacienda_outbox', ['invoice_id'], unique=False)
    op.create_index(op.f('ix_hacienda_outbox_numeric_key'), 'hacienda_outbox', ['numeric_key'], unique=False)
    op.create_index(op.f('ix_hacienda_outbox_next_retry_at'), 'hacienda_outbox', ['next_retry_at'], unique=False)
    op.create_index(op.f('ix_hacienda_outbox_status'), 'hacienda_outbox', ['status'], unique=False)

    # 25. Idempotency Records
    op.create_table(
        'idempotency_records',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('operation', sa.String(length=50), nullable=False),
        sa.Column('idempotency_key', sa.String(length=128), nullable=False),
        sa.Column('request_hash', sa.String(length=64), nullable=False),
        sa.Column('response_payload', sa.Text(), nullable=True),
        sa.Column('status_code', sa.Integer(), server_default='200', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='IN_PROGRESS', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'operation', 'idempotency_key', name='uq_org_op_idempotency')
    )
    op.create_index(op.f('ix_idempotency_records_organization_id'), 'idempotency_records', ['organization_id'], unique=False)
    op.create_index(op.f('ix_idempotency_records_idempotency_key'), 'idempotency_records', ['idempotency_key'], unique=False)
    op.create_index(op.f('ix_idempotency_records_expires_at'), 'idempotency_records', ['expires_at'], unique=False)

    # 26. Support Tickets
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
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_tickets_ticket_number'), 'support_tickets', ['ticket_number'], unique=True)
    op.create_index(op.f('ix_support_tickets_organization_id'), 'support_tickets', ['organization_id'], unique=False)

    # 27. Support Messages
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
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_messages_ticket_id'), 'support_messages', ['ticket_id'], unique=False)

    # 28. Delegated Access Grants
    op.create_table(
        'delegated_access_grants',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('granted_by_user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('support_agent_id', app.db.base.GUID(length=36), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('permission_level', sa.String(length=30), server_default='READ_ONLY', nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['granted_by_user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['support_agent_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delegated_access_grants_token_hash'), 'delegated_access_grants', ['token_hash'], unique=True)
    op.create_index(op.f('ix_delegated_access_grants_organization_id'), 'delegated_access_grants', ['organization_id'], unique=False)

    # 29. Audit Logs
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
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_organization_id'), 'audit_logs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_actor_id'), 'audit_logs', ['actor_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_event_hash'), 'audit_logs', ['event_hash'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('delegated_access_grants')
    op.drop_table('support_messages')
    op.drop_table('support_tickets')
    op.drop_table('idempotency_records')
    op.drop_table('hacienda_outbox')
    op.drop_table('electronic_invoices')
    op.drop_table('fiscal_credentials')
    op.drop_table('consecutive_sequences')
    op.drop_table('sale_payments')
    op.drop_table('sale_items')
    op.drop_table('sales')
    op.drop_table('purchase_items')
    op.drop_table('purchases')
    op.drop_table('suppliers')
    op.drop_table('customers')
    op.drop_table('inventory_movements')
    op.drop_table('branch_product_stocks')
    op.drop_table('products')
    op.drop_table('tax_rates')
    op.drop_table('categories')
    op.drop_table('cash_movements')
    op.drop_table('cash_register_sessions')
    op.drop_table('cash_registers')
    op.drop_table('user_sessions')
    op.drop_table('user_branch_access')
    op.drop_table('users')
    op.drop_table('branches')
    op.drop_table('organizations')
