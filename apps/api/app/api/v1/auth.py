from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.schemas.common import StandardResponse
from app.services.auth_service import AuthService
from app.security.deps import get_current_user_context, CurrentUserContext
from app.security.rbac import get_role_permissions
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=StandardResponse[TokenResponse])
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db)
    user, access_token, refresh_token = await service.authenticate_user(
        email=payload.email,
        password=payload.password,
        ip_address=ip_address,
        user_agent=user_agent
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return StandardResponse(
        data=TokenResponse(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
        message="Inicio de sesión exitoso"
    )

@router.post("/refresh", response_model=StandardResponse[TokenResponse])
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    raw_refresh = request.cookies.get("refresh_token") or request.headers.get("X-Refresh-Token")

    service = AuthService(db)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    user, new_access, new_refresh = await service.rotate_refresh_token(
        raw_refresh_token=raw_refresh or "",
        ip_address=ip_address,
        user_agent=user_agent
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )

    return StandardResponse(
        data=TokenResponse(
            access_token=new_access,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
        message="Token renovado"
    )

@router.post("/logout", response_model=StandardResponse[dict])
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    raw_refresh = request.cookies.get("refresh_token")
    if raw_refresh:
        service = AuthService(db)
        await service.revoke_session(raw_refresh)

    response.delete_cookie(key="refresh_token", path="/", domain=settings.COOKIE_DOMAIN)
    return StandardResponse(data={}, message="Sesión cerrada correctamente")

@router.get("/me", response_model=StandardResponse[UserProfileResponse])
async def get_me(
    context: CurrentUserContext = Depends(get_current_user_context)
):
    perms = list(get_role_permissions(context.role))
    return StandardResponse(
        data=UserProfileResponse(
            id=context.user.id,
            email=context.user.email,
            full_name=context.user.full_name,
            phone=context.user.phone,
            role=context.user.role,
            organization_id=context.organization_id,
            organization_name=context.organization.trade_name if context.organization else "ORBÍTICA STUDIO",
            accessible_branches=context.accessible_branch_ids,
            permissions=perms
        )
    )
