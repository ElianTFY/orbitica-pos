import uuid
from typing import List, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.branch import Branch, UserBranchAccess
from app.schemas.user import UserCreate, UserUpdate
from app.security.password import hash_password
from app.core.constants import UserRole, ASSIGNABLE_ROLES
from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException
from app.services.audit_service import AuditService

def to_user_role(role_val: Union[UserRole, str]) -> UserRole:
    if isinstance(role_val, UserRole):
        return role_val
    try:
        return UserRole(str(role_val).lower())
    except ValueError:
        raise ForbiddenException(f"Rol '{role_val}' inválido")

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

    async def create_user(
        self,
        data: UserCreate,
        creator_id: uuid.UUID,
        creator_role: Union[UserRole, str]
    ) -> User:
        c_role = to_user_role(creator_role)
        t_role = to_user_role(data.role)

        # Enforce role assignment matrix
        allowed_roles = ASSIGNABLE_ROLES.get(c_role, set())
        if t_role not in allowed_roles:
            raise ForbiddenException(
                f"El rol '{c_role.value}' no tiene autorización para asignar o crear usuarios con rol '{t_role.value}'."
            )

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
            role=t_role
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
            payload_after={"email": user.email, "role": user.role.value if hasattr(user.role, 'value') else str(user.role)}
        )

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(
        self,
        user_id: uuid.UUID,
        data: UserUpdate,
        actor_id: uuid.UUID,
        actor_role: Union[UserRole, str]
    ) -> User:
        user = await self.get_user(user_id)
        a_role = to_user_role(actor_role)

        # Prohibit self-role modification
        if data.role is not None:
            t_role = to_user_role(data.role)
            if t_role != user.role:
                if actor_id == user_id:
                    raise ForbiddenException("No puedes modificar tu propio rol")
                allowed_roles = ASSIGNABLE_ROLES.get(a_role, set())
                if t_role not in allowed_roles:
                    raise ForbiddenException(
                        f"El rol '{a_role.value}' no tiene autorización para asignar el rol '{t_role.value}'."
                    )
                user.role = t_role

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone
        if data.is_active is not None:
            if actor_id == user_id and data.is_active is False:
                raise ForbiddenException("No puedes deshabilitar tu propio usuario")
            user.is_active = data.is_active

        await AuditService.log_action(
            db=self.db,
            action="USER_UPDATED",
            resource="User",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(user.id),
            payload_after={"email": user.email, "role": user.role.value if hasattr(user.role, 'value') else str(user.role), "is_active": user.is_active}
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
