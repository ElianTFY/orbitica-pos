from typing import Optional, List, Callable
from uuid import UUID
from datetime import datetime, timezone
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.security.tokens import decode_access_token
from app.security.rbac import has_permission
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.constants import UserRole

bearer_scheme = HTTPBearer(auto_error=False)

class CurrentUserContext:
    def __init__(
        self,
        user: User,
        organization: Optional[Organization] = None,
        accessible_branch_ids: Optional[List[UUID]] = None,
        selected_branch_id: Optional[UUID] = None
    ):
        self.user = user
        self.user_id = user.id
        self.email = user.email
        self.role = user.role
        self.organization = organization
        self.organization_id = organization.id if organization else None
        self.accessible_branch_ids = accessible_branch_ids or []
        self.selected_branch_id = selected_branch_id

async def get_current_user_context(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> CurrentUserContext:
    token = None
    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise UnauthorizedException("No se proporcionó token de autenticación")
        
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Token inválido (sin sujeto)")
        user_id = UUID(user_id_str)
    except Exception as e:
        raise UnauthorizedException(f"Token inválido o expirado: {str(e)}")
        
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise UnauthorizedException("Usuario no encontrado o inactivo")
        
    if user.locked_until:
        now = datetime.now(timezone.utc)
        user_lock = user.locked_until
        if user_lock.tzinfo is None:
            user_lock = user_lock.replace(tzinfo=timezone.utc)
        if user_lock > now:
            raise UnauthorizedException("Cuenta temporalmente bloqueada")
        
    organization = None
    if user.organization_id:
        org_stmt = select(Organization).where(Organization.id == user.organization_id, Organization.is_active == True)
        org_result = await db.execute(org_stmt)
        organization = org_result.scalar_one_or_none()
        if not organization:
            raise UnauthorizedException("Organización no encontrada o inactiva")

    branch_stmt = select(UserBranchAccess.branch_id).where(UserBranchAccess.user_id == user.id)
    branch_result = await db.execute(branch_stmt)
    branch_ids = list(branch_result.scalars().all())
    
    selected_branch_id = None
    req_branch_header = request.headers.get("X-Branch-ID")
    if req_branch_header:
        try:
            req_b_uuid = UUID(req_branch_header)
            if user.role in [UserRole.SUPERADMIN, UserRole.OWNER] or req_b_uuid in branch_ids:
                selected_branch_id = req_b_uuid
        except ValueError:
            pass
            
    return CurrentUserContext(
        user=user,
        organization=organization,
        accessible_branch_ids=branch_ids,
        selected_branch_id=selected_branch_id
    )

def require_permissions(*required_permissions: str) -> Callable:
    def dependency(context: CurrentUserContext = Depends(get_current_user_context)) -> CurrentUserContext:
        for perm in required_permissions:
            if not has_permission(context.role, perm):
                raise ForbiddenException(f"Permiso requerido no concedido: {perm}")
        return context
    return dependency

def require_superadmin(context: CurrentUserContext = Depends(get_current_user_context)) -> CurrentUserContext:
    if context.role != UserRole.SUPERADMIN:
        raise ForbiddenException("Acceso exclusivo para Superadministradores de Orbítica")
    return context
