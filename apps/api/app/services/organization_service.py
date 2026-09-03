import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.organization import Organization, OrganizationMembership
from app.models.branch import Branch, UserBranchAccess
from app.models.cash_register import CashRegister
from app.models.user import User, UserSession
from app.models.catalog import TaxRate
from app.models.onboarding import OrganizationOnboarding
from app.models.subscription import Subscription
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from app.security.password import hash_password
from app.security.tokens import create_access_token, generate_refresh_token, hash_token, verify_registration_token
from app.core.constants import UserRole
from app.core.exceptions import ConflictException, BadRequestException, NotFoundException
from app.services.audit_service import AuditService

class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_organization(self, data: OrganizationCreate) -> Organization:
        # Validate registration token if provided
        if data.registration_token:
            if not verify_registration_token(data.registration_token, data.owner_email):
                raise BadRequestException("Token de verificación de correo inválido o expirado")

        normalized_email = data.owner_email.strip().lower()

        # Check unique user normalized email
        user_stmt = select(User).where(User.normalized_email == normalized_email)
        user_res = await self.db.execute(user_stmt)
        if user_res.scalar_one_or_none():
            raise ConflictException(
                "EMAIL_ALREADY_REGISTERED: El correo electrónico ya está registrado. "
                "Inicia sesión para agregar o gestionar tus negocios."
            )

        # Check unique identification_number if provided
        clean_id_number = data.identification_number.strip() if data.identification_number else None
        if clean_id_number:
            stmt = select(Organization).where(Organization.identification_number == clean_id_number)
            res = await self.db.execute(stmt)
            if res.scalar_one_or_none():
                raise ConflictException("Ya existe una empresa registrada con ese número de identificación")

        try:
            # 1. Organization (Start blank on legal/fiscal unless explicitly entered)
            org = Organization(
                legal_name=data.legal_name.strip() if data.legal_name else "",
                trade_name=data.trade_name.strip() if data.trade_name else "",
                identification_type=data.identification_type or "02",
                identification_number=clean_id_number,
                email=data.email.strip().lower() if data.email else None,
                phone=data.phone.strip() if data.phone else None,
                country_code=data.country_code or "CR",
                default_currency=data.default_currency or "CRC"
            )
            self.db.add(org)
            await self.db.flush()

            # 2. Main Branch
            branch = Branch(
                organization_id=org.id,
                code="001",
                name=data.initial_branch_name or "Sucursal Principal",
                address=data.initial_branch_address,
                phone=data.phone,
                is_main=True
            )
            self.db.add(branch)
            await self.db.flush()

            # 3. Default Cash Register for Main Branch
            cash_reg = CashRegister(
                organization_id=org.id,
                branch_id=branch.id,
                name="Caja 01 - Principal",
                pos_terminal_number="00001",
                is_active=True
            )
            self.db.add(cash_reg)

            # 4. Standard Costa Rica Tax Rates (IVA)
            default_taxes = [
                TaxRate(organization_id=org.id, name="IVA General 13%", code_cr="01", rate=Decimal("13.00"), is_default=True),
                TaxRate(organization_id=org.id, name="IVA Reducido 4%", code_cr="02", rate=Decimal("4.00"), is_default=False),
                TaxRate(organization_id=org.id, name="IVA Reducido 2%", code_cr="03", rate=Decimal("2.00"), is_default=False),
                TaxRate(organization_id=org.id, name="IVA Canasta Básica 1%", code_cr="04", rate=Decimal("1.00"), is_default=False),
                TaxRate(organization_id=org.id, name="Exento 0%", code_cr="05", rate=Decimal("0.00"), is_default=False),
            ]
            self.db.add_all(default_taxes)

            # 5. Owner User
            owner = User(
                organization_id=org.id,
                email=normalized_email,
                normalized_email=normalized_email,
                password_hash=hash_password(data.owner_password),
                full_name=data.owner_full_name.strip(),
                phone=data.owner_phone.strip() if data.owner_phone else None,
                role=UserRole.OWNER,
                email_verified=True,
                email_2fa_enabled=data.enable_2fa,
                totp_enabled=False
            )
            self.db.add(owner)
            await self.db.flush()

            # 6. User Branch Access
            access = UserBranchAccess(
                user_id=owner.id,
                branch_id=branch.id,
                is_default=True
            )
            self.db.add(access)

            # 7. Organization Membership
            membership = OrganizationMembership(
                user_id=owner.id,
                organization_id=org.id,
                role=UserRole.OWNER,
                is_active=True
            )
            self.db.add(membership)

            # 8. Persistent Onboarding State
            onboarding = OrganizationOnboarding(
                organization_id=org.id,
                current_step=1,
                is_completed=False,
                business_data_completed=bool(clean_id_number and org.legal_name),
                fiscal_data_completed=False,
                branches_completed=True,
                payments_completed=False,
                products_completed=False,
                contacts_completed=False,
                users_completed=False
            )
            self.db.add(onboarding)

            # 9. Persistent Trial Subscription (14 days)
            now = datetime.now(timezone.utc)
            subscription = Subscription(
                organization_id=org.id,
                plan_id="TRIAL",
                status="ACTIVE",
                trial_ends_at=now + timedelta(days=14),
                current_period_start=now,
                current_period_end=now + timedelta(days=14),
                branches_limit=1,
                users_limit=3,
                price_monthly=Decimal("0.00"),
                currency="CRC",
                is_active=True
            )
            self.db.add(subscription)

            # 10. Audit Log
            await AuditService.log_action(
                db=self.db,
                action="ORG_REGISTERED",
                resource="Organization",
                actor_id=owner.id,
                organization_id=org.id,
                resource_id=str(org.id),
                payload_after={"legal_name": org.legal_name, "owner_email": owner.email}
            )

            # 11. Create Session and Access Token
            refresh_token = generate_refresh_token()
            session = UserSession(
                user_id=owner.id,
                family_id=uuid.uuid4(),
                refresh_token_hash=hash_token(refresh_token),
                expires_at=now + timedelta(days=7)
            )
            self.db.add(session)

            await self.db.commit()
            await self.db.refresh(org)

            token_claims = {
                "organization_id": str(org.id),
                "role": owner.role,
                "email": owner.email,
                "permissions": ["*"]
            }
            setattr(org, "access_token", create_access_token(str(owner.id), claims=token_claims))
            return org

        except Exception:
            await self.db.rollback()
            raise

    async def create_additional_organization_for_user(
        self,
        user: User,
        trade_name: str,
        legal_name: Optional[str] = None,
        identification_type: Optional[str] = "02",
        identification_number: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        currency: str = "CRC"
    ) -> Organization:
        clean_id_number = identification_number.strip() if identification_number else None
        if clean_id_number:
            stmt = select(Organization).where(Organization.identification_number == clean_id_number)
            res = await self.db.execute(stmt)
            if res.scalar_one_or_none():
                raise ConflictException("Ya existe una empresa registrada con ese número de identificación")

        try:
            org = Organization(
                legal_name=legal_name.strip() if legal_name else "",
                trade_name=trade_name.strip(),
                identification_type=identification_type or "02",
                identification_number=clean_id_number,
                email=email.strip().lower() if email else None,
                phone=phone.strip() if phone else None,
                default_currency=currency or "CRC"
            )
            self.db.add(org)
            await self.db.flush()

            branch = Branch(
                organization_id=org.id,
                code="001",
                name="Sucursal Principal",
                is_main=True
            )
            self.db.add(branch)
            await self.db.flush()

            cash_reg = CashRegister(
                organization_id=org.id,
                branch_id=branch.id,
                name="Caja 01 - Principal",
                pos_terminal_number="00001",
                is_active=True
            )
            self.db.add(cash_reg)

            default_taxes = [
                TaxRate(organization_id=org.id, name="IVA General 13%", code_cr="01", rate=Decimal("13.00"), is_default=True),
                TaxRate(organization_id=org.id, name="IVA Reducido 4%", code_cr="02", rate=Decimal("4.00"), is_default=False),
                TaxRate(organization_id=org.id, name="IVA Reducido 2%", code_cr="03", rate=Decimal("2.00"), is_default=False),
                TaxRate(organization_id=org.id, name="IVA Canasta Básica 1%", code_cr="04", rate=Decimal("1.00"), is_default=False),
                TaxRate(organization_id=org.id, name="Exento 0%", code_cr="05", rate=Decimal("0.00"), is_default=False),
            ]
            self.db.add_all(default_taxes)

            access = UserBranchAccess(
                user_id=user.id,
                branch_id=branch.id,
                is_default=True
            )
            self.db.add(access)

            membership = OrganizationMembership(
                user_id=user.id,
                organization_id=org.id,
                role=UserRole.OWNER,
                is_active=True
            )
            self.db.add(membership)

            onboarding = OrganizationOnboarding(
                organization_id=org.id,
                current_step=1,
                is_completed=False,
                business_data_completed=bool(clean_id_number and legal_name),
                fiscal_data_completed=False,
                branches_completed=True,
                payments_completed=False,
                products_completed=False,
                contacts_completed=False,
                users_completed=False
            )
            self.db.add(onboarding)

            now = datetime.now(timezone.utc)
            subscription = Subscription(
                organization_id=org.id,
                plan_id="TRIAL",
                status="ACTIVE",
                trial_ends_at=now + timedelta(days=14),
                current_period_start=now,
                current_period_end=now + timedelta(days=14),
                branches_limit=1,
                users_limit=3,
                price_monthly=Decimal("0.00"),
                currency=currency or "CRC",
                is_active=True
            )
            self.db.add(subscription)

            await AuditService.log_action(
                db=self.db,
                action="ORG_CREATED_ADDITIONAL",
                resource="Organization",
                actor_id=user.id,
                organization_id=org.id,
                resource_id=str(org.id),
                payload_after={"trade_name": org.trade_name, "owner_email": user.email}
            )

            await self.db.commit()
            await self.db.refresh(org)
            return org

        except Exception:
            await self.db.rollback()
            raise

    async def get_onboarding(self, organization_id: uuid.UUID) -> OrganizationOnboarding:
        stmt = select(OrganizationOnboarding).where(OrganizationOnboarding.organization_id == organization_id)
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            # Lazy initialize if missing
            record = OrganizationOnboarding(
                organization_id=organization_id,
                current_step=1,
                is_completed=False
            )
            self.db.add(record)
            await self.db.commit()
            await self.db.refresh(record)
        return record

    async def update_onboarding(self, organization_id: uuid.UUID, data: dict) -> OrganizationOnboarding:
        record = await self.get_onboarding(organization_id)
        for k, v in data.items():
            if v is not None and hasattr(record, k):
                setattr(record, k, v)
        record.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(record)
        return record
