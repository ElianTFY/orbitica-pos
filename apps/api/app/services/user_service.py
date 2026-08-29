import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.branch import Branch, UserBranchAccess
from app.schemas.user import UserCreate
from app.security.password import hash_password
from app.core.exceptions import NotFoundException, ConflictException
from app.services.audit_service import AuditService

class UserService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_users(self) -> List[User]:
        stmt = select(User).where(
            User.organization_id == self.organization_id,
            User.is_active == True
        ).order_by(User.full_name.asc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_user(self, data: UserCreate, creator_id: uuid.UUID) -> User:
        stmt = select(User).where(User.email == data.email.strip().lower())
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException("El correo ya está en uso")

        user = User(
            organization_id=self.organization_id,
            email=data.email.strip().lower(),
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            phone=data.phone,
            role=data.role
        )
        self.db.add(user)
        await self.db.flush()

        for b_id in data.branch_ids:
            b_stmt = select(Branch).where(Branch.id == b_id, Branch.organization_id == self.organization_id)
            b_res = await self.db.execute(b_stmt)
            if b_res.scalar_one_or_none():
                access = UserBranchAccess(user_id=user.id, branch_id=b_id, is_default=False)
                self.db.add(access)

        await AuditService.log_action(
            db=self.db,
            action="USER_CREATED",
            resource="User",
            actor_id=creator_id,
            organization_id=self.organization_id,
            resource_id=str(user.id),
            payload_after={"email": user.email, "role": user.role}
        )

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_user(self, user_id: uuid.UUID) -> User:
        stmt = select(User).where(
            User.id == user_id,
            User.organization_id == self.organization_id
        )
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise NotFoundException("Usuario no encontrado")
        return user
