"""auth challenges memberships onboarding subscription

Revision ID: 0003_auth_challenges_memberships_onboarding
Revises: 0002_audit_append_only
Create Date: 2026-09-03 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import app.db.base

# revision identifiers, used by Alembic.
revision: str = "0003_auth_challenges_memberships_onboarding"
down_revision: Union[str, None] = "0002_audit_append_only"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add normalized_email and email_2fa_enabled to users
    op.add_column('users', sa.Column('normalized_email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_2fa_enabled', sa.Boolean(), server_default='0', nullable=False))
    
    # Backfill normalized_email
    op.execute("UPDATE users SET normalized_email = lower(email) WHERE normalized_email IS NULL")
    
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('normalized_email', nullable=False)
        batch_op.create_unique_constraint('uq_users_normalized_email', ['normalized_email'])

    # 2. Relax organizations legal fields for clean onboarding
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.alter_column('legal_name', server_default='', nullable=False)
        batch_op.alter_column('trade_name', server_default='', nullable=False)
        batch_op.alter_column('identification_number', nullable=True)
        batch_op.alter_column('email', nullable=True)

    # 3. Create email_verification_challenges
    op.create_table(
        'email_verification_challenges',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('code_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_consumed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_verification_challenges_email'), 'email_verification_challenges', ['email'], unique=False)

    # 4. Create two_factor_challenges
    op.create_table(
        'two_factor_challenges',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('challenge_token', sa.String(length=255), nullable=False),
        sa.Column('code_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_consumed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_two_factor_challenges_user_id'), 'two_factor_challenges', ['user_id'], unique=False)
    op.create_index(op.f('ix_two_factor_challenges_challenge_token'), 'two_factor_challenges', ['challenge_token'], unique=True)

    # 5. Create organization_memberships
    op.create_table(
        'organization_memberships',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('user_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='OWNER', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'organization_id', name='uq_user_org_membership')
    )
    op.create_index(op.f('ix_organization_memberships_user_id'), 'organization_memberships', ['user_id'], unique=False)
    op.create_index(op.f('ix_organization_memberships_organization_id'), 'organization_memberships', ['organization_id'], unique=False)

    # 6. Create organization_onboarding
    op.create_table(
        'organization_onboarding',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('current_step', sa.Integer(), server_default='1', nullable=False),
        sa.Column('is_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('business_data_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('fiscal_data_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('branches_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('payments_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('products_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('contacts_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('users_completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organization_onboarding_organization_id'), 'organization_onboarding', ['organization_id'], unique=True)

    # 7. Create subscriptions
    op.create_table(
        'subscriptions',
        sa.Column('id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('organization_id', app.db.base.GUID(length=36), nullable=False),
        sa.Column('plan_id', sa.String(length=50), server_default='TRIAL', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('branches_limit', sa.Integer(), server_default='1', nullable=False),
        sa.Column('users_limit', sa.Integer(), server_default='3', nullable=False),
        sa.Column('price_monthly', sa.Numeric(precision=14, scale=2), server_default='0.00', nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='CRC', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscriptions_organization_id'), 'subscriptions', ['organization_id'], unique=True)

def downgrade() -> None:
    op.drop_table('subscriptions')
    op.drop_table('organization_onboarding')
    op.drop_table('organization_memberships')
    op.drop_table('two_factor_challenges')
    op.drop_table('email_verification_challenges')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint('uq_users_normalized_email', type_='unique')
        batch_op.drop_column('email_2fa_enabled')
        batch_op.drop_column('normalized_email')
