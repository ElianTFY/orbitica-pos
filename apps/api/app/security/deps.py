from typing import Optional, List, Callable, Any
from uuid import UUID
from datetime import datetime, timezone
from fastapi import Depends, Request, Query, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.security.tokens import decode_access_token
from app.security.rbac import has_permission
from app.core.exceptions import UnauthorizedException, ForbiddenException, NotFoundException
from app.core.constants import UserRole

bearer_scheme = HTTPBearer(auto_error=False)

class CurrentUserContext:
    def __init__(
        self,
        user: User,
        organization: Optional[Organization] = None,
        accessible_branch_ids: Optional[List[UUID]] = None,
        selected_branch_id: Optional[UUID] = None,
        db: Optional[AsyncSession] = None
    ):
        self.user = user
        self.user_id = user.id
        self.email = user.email
        self.role = user.role
        self.organization = organization
        self.organization_id = organization.id if organization else None
        self.accessible_branch_ids = accessible_branch_ids or []
        self.selected_branch_id = selected_branch_id
        self.db = db

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
    
    # Strict tenant isolation for X-Branch-ID:
    # NEVER trust X-Branch-ID blindly. Verify that the requested branch strictly belongs to user.organization_id!
    selected_branch_id = None
    req_branch_header = request.headers.get("X-Branch-ID")
    if req_branch_header:
        try:
            req_b_uuid = UUID(req_branch_header)
            if user.organization_id:
                b_check_stmt = select(Branch).where(
                    Branch.id == req_b_uuid,
                    Branch.organization_id == user.organization_id,
                    Branch.is_active == True
                )
                b_check_res = await db.execute(b_check_stmt)
                valid_branch = b_check_res.scalar_one_or_none()
                if valid_branch:
                    if user.role in [UserRole.SUPERADMIN, UserRole.OWNER] or req_b_uuid in branch_ids:
                        selected_branch_id = req_b_uuid
        except ValueError:
            pass
            
    return CurrentUserContext(
        user=user,
        organization=organization,
        accessible_branch_ids=branch_ids,
        selected_branch_id=selected_branch_id,
        db=db
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

def require_organization_access(context: CurrentUserContext = Depends(get_current_user_context)) -> CurrentUserContext:
    """
    Enforces that the authenticated user belongs to an active tenant organization.
    Superadmins without delegated access cannot bypass tenant boundaries.
    """
    if not context.organization_id and context.role != UserRole.SUPERADMIN:
        raise ForbiddenException("Acceso denegado: usuario sin organización asignada")
    return context

def require_branch_access(branch_id_param_name: str = "branch_id") -> Callable:
    """
    Centralized branch tenant boundary enforcement.
    Rules:
    - Owner can use any branch belonging to their organization, but NONE from external organizations.
    - Managers, cashiers and accountants can only use branches explicitly assigned in UserBranchAccess.
    - Superadmin requires explicit delegated access grant.
    """
    async def dependency(
        request: Request,
        context: CurrentUserContext = Depends(get_current_user_context),
        db: AsyncSession = Depends(get_db)
    ) -> Branch:
        # Resolve target branch id from path params, query params, headers, or body
        branch_id_str = (
            request.path_params.get(branch_id_param_name) or
            request.query_params.get(branch_id_param_name) or
            request.headers.get("X-Branch-ID")
        )

        if not branch_id_str and context.selected_branch_id:
            target_branch_id = context.selected_branch_id
        elif branch_id_str:
            try:
                target_branch_id = UUID(str(branch_id_str))
            except ValueError:
                raise ForbiddenException("Identificador de sucursal inválido")
        else:
            raise ForbiddenException("Identificador de sucursal requerido")

        # Query branch belonging strictly to user organization
        stmt = select(Branch).where(
            Branch.id == target_branch_id,
            Branch.is_active == True
        )
        if context.role != UserRole.SUPERADMIN:
            stmt = stmt.where(Branch.organization_id == context.organization_id)

        res = await db.execute(stmt)
        branch = res.scalar_one_or_none()

        if not branch:
            raise ForbiddenException("Sucursal no encontrada o no pertenece a tu organización")

        # If not Owner or Superadmin, verify explicit branch assignment
        if context.role not in [UserRole.OWNER, UserRole.SUPERADMIN]:
            if branch.id not in context.accessible_branch_ids:
                raise ForbiddenException("El usuario no tiene autorización para operar en esta sucursal")

        return branch

    return dependency

def require_resource_tenant_scope(model_class: Any, id_param_name: str = "id") -> Callable:
    """
    Enforces that a specific resource instance strictly belongs to the user's organization.
    Prevents IDOR by validating model_class.organization_id == context.organization_id.
    """
    async def dependency(
        request: Request,
        context: CurrentUserContext = Depends(get_current_user_context),
        db: AsyncSession = Depends(get_db)
    ) -> Any:
        resource_id_str = request.path_params.get(id_param_name) or request.query_params.get(id_param_name)
        if not resource_id_str:
            raise ForbiddenException(f"Identificador '{id_param_name}' requerido")

        try:
            resource_id = UUID(str(resource_id_str))
        except ValueError:
            raise NotFoundException(f"Recurso '{model_class.__name__}' no encontrado")

        stmt = select(model_class).where(model_class.id == resource_id)
        if hasattr(model_class, "organization_id") and context.role != UserRole.SUPERADMIN:
            stmt = stmt.where(model_class.organization_id == context.organization_id)

        res = await db.execute(stmt)
        instance = res.scalar_one_or_none()

        if not instance:
            raise NotFoundException(f"Recurso '{model_class.__name__}' no encontrado")

        return instance

    return dependency
