import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.branch import Branch
from app.schemas.branch import BranchCreate
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
