import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate
from app.models.cash_register import CashRegisterSession
from app.models.organization import Organization
from app.services.audit_service import AuditService
from app.core.exceptions import NotFoundException, ConflictException

class BranchService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_branches(self) -> List[Branch]:
        stmt = select(Branch).where(
            Branch.organization_id == self.organization_id,
            Branch.is_active == True
        ).order_by(Branch.code.asc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_branch(self, data: BranchCreate) -> Branch:
        stmt = select(Branch).where(
            Branch.organization_id == self.organization_id,
            Branch.code == data.code.strip()
        )
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException(f"Ya existe una sucursal con el código '{data.code}' en esta empresa")

        branch = Branch(
            organization_id=self.organization_id,
            code=data.code.strip(),
            name=data.name,
            address=data.address,
            phone=data.phone,
            is_main=data.is_main
        )
        self.db.add(branch)
        await self.db.commit()
        await self.db.refresh(branch)
        return branch

    async def get_branch(self, branch_id: uuid.UUID) -> Branch:
        stmt = select(Branch).where(
            Branch.id == branch_id,
            Branch.organization_id == self.organization_id
        )
        res = await self.db.execute(stmt)
        branch = res.scalar_one_or_none()
        if not branch:
            raise NotFoundException("Sucursal no encontrada")
        return branch

    async def update_branch(self, branch_id: uuid.UUID, data: BranchUpdate, actor_id: uuid.UUID) -> Branch:
        # Serialize organization setup and block deactivation of a live drawer.
        await self.db.execute(select(Organization).where(Organization.id == self.organization_id).with_for_update())
        branch = await self.get_branch(branch_id)
        if data.code is not None and data.code != branch.code:
            raise ConflictException("El código fiscal no se puede modificar; cree otra sucursal con numeración independiente")
        if data.is_active is False:
            if branch.is_main:
                raise ConflictException("No se puede desactivar la sucursal principal")
            active = (await self.db.execute(select(CashRegisterSession.id).where(
                CashRegisterSession.branch_id == branch.id, CashRegisterSession.status == "OPEN",
            ).limit(1))).first()
            if active:
                raise ConflictException("Cierre los turnos de esta sucursal antes de desactivarla")
        for field, value in data.model_dump(exclude_unset=True).items():
            if field != "code":
                setattr(branch, field, value)
        await AuditService.log_action(db=self.db, action="BRANCH_UPDATED", resource="Branch", actor_id=actor_id,
            organization_id=self.organization_id, branch_id=branch.id, resource_id=str(branch.id),
            payload_after=data.model_dump(mode="json", exclude_unset=True))
        await self.db.commit()
        await self.db.refresh(branch)
        return branch
