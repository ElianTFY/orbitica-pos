import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.models.user import User
from app.models.catalog import TaxRate
from app.schemas.organization import OrganizationCreate
from app.security.password import hash_password
from app.core.constants import UserRole
from app.core.exceptions import ConflictException
from app.services.audit_service import AuditService

class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_organization(self, data: OrganizationCreate) -> Organization:
        stmt = select(Organization).where(Organization.identification_number == data.identification_number.strip())
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException("Ya existe una empresa registrada con ese número de identificación")

        user_stmt = select(User).where(User.email == data.owner_email.strip().lower())
        user_res = await self.db.execute(user_stmt)
        if user_res.scalar_one_or_none():
            raise ConflictException("El correo del propietario ya está registrado")

        org = Organization(
            legal_name=data.legal_name,
            trade_name=data.trade_name,
            identification_type=data.identification_type,
            identification_number=data.identification_number.strip(),
            email=data.email.strip().lower(),
            phone=data.phone,
            country_code=data.country_code,
            default_currency=data.default_currency
        )
        self.db.add(org)
        await self.db.flush()

        branch = Branch(
            organization_id=org.id,
            code="001",
            name=data.initial_branch_name,
            address=data.initial_branch_address,
            phone=data.phone,
            is_main=True
        )
        self.db.add(branch)
        await self.db.flush()

        default_taxes = [
            TaxRate(organization_id=org.id, name="IVA General 13%", code_cr="01", rate=13.00, is_default=True),
            TaxRate(organization_id=org.id, name="IVA Reducido 4%", code_cr="02", rate=4.00, is_default=False),
            TaxRate(organization_id=org.id, name="IVA Reducido 2%", code_cr="03", rate=2.00, is_default=False),
            TaxRate(organization_id=org.id, name="IVA Canasta Básica 1%", code_cr="04", rate=1.00, is_default=False),
            TaxRate(organization_id=org.id, name="Exento 0%", code_cr="05", rate=0.00, is_default=False),
        ]
        self.db.add_all(default_taxes)

        owner = User(
            organization_id=org.id,
            email=data.owner_email.strip().lower(),
            password_hash=hash_password(data.owner_password),
            full_name=data.owner_full_name,
            phone=data.phone,
            role=UserRole.OWNER
        )
        self.db.add(owner)
        await self.db.flush()

        access = UserBranchAccess(
            user_id=owner.id,
            branch_id=branch.id,
            is_default=True
        )
        self.db.add(access)

        await AuditService.log_action(
            db=self.db,
            action="ORG_REGISTERED",
            resource="Organization",
            actor_id=owner.id,
            organization_id=org.id,
            resource_id=str(org.id),
            payload_after={"legal_name": org.legal_name, "owner_email": owner.email}
        )

        await self.db.commit()
        await self.db.refresh(org)
        return org
