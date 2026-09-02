from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Response, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserProfileResponse,
    PasswordRecoveryRequest,
    PasswordResetRequest,
    EmailVerificationRequest,
    StepUpAuthRequest,
    StepUpAuthResponse
)
from app.schemas.common import StandardResponse
from app.services.auth_service import AuthService
from app.security.deps import get_current_user_context, CurrentUserContext
from app.security.rbac import get_role_permissions
from app.core.config import settings

class MFAEnrollResponse(BaseModel):
    secret: str
    provisioning_uri: str

class MFAActivateRequest(BaseModel):
    totp_code: str = Field(min_length=6, max_length=8)

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
        totp_code=payload.totp_code,
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
            totp_enabled=context.user.totp_enabled,
            email_verified=context.user.email_verified,
            organization_id=context.organization_id,
            organization_name=context.organization.trade_name if context.organization else "ORBÍTICA STUDIO",
            accessible_branches=context.accessible_branch_ids,
            permissions=perms
        )
    )

@router.post("/mfa/enroll", response_model=StandardResponse[MFAEnrollResponse])
async def enroll_mfa(
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    res = await service.enroll_totp(context.user.id)
    return StandardResponse(
        data=MFAEnrollResponse(
            secret=res["secret"],
            provisioning_uri=res["provisioning_uri"]
        ),
        message="Secreto TOTP generado. Escanee el código y active con su primer código de 6 dígitos."
    )

@router.post("/mfa/activate", response_model=StandardResponse[dict])
async def activate_mfa(
    payload: MFAActivateRequest,
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    await service.activate_totp(context.user.id, payload.totp_code)
    return StandardResponse(
        data={"activated": True},
        message="Autenticación multifactor TOTP activada exitosamente."
    )

@router.post("/recovery", response_model=StandardResponse[dict])
async def request_recovery(
    payload: PasswordRecoveryRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    token = await service.request_password_recovery(payload.email)
    return StandardResponse(
        data={"sent": True},
        message="Si el correo existe en la plataforma, se ha enviado un enlace de recuperación."
    )

@router.post("/reset-password", response_model=StandardResponse[dict])
async def reset_password(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    await service.reset_password_with_token(payload.token, payload.new_password)
    return StandardResponse(
        data={"reset": True},
        message="Contraseña restablecida con éxito. Inicia sesión con tu nueva contraseña."
    )

@router.post("/verify-email/request", response_model=StandardResponse[dict])
async def request_email_verification(
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    await service.request_email_verification(context.user.id)
    return StandardResponse(
        data={"requested": True},
        message="Código de verificación enviado al correo electrónico."
    )

@router.post("/verify-email/confirm", response_model=StandardResponse[dict])
async def confirm_email_verification(
    payload: EmailVerificationRequest,
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    await service.verify_email_code(context.user.id, payload.code)
    return StandardResponse(
        data={"verified": True},
        message="Correo electrónico verificado exitosamente."
    )

@router.post("/step-up", response_model=StandardResponse[StepUpAuthResponse])
async def issue_step_up_token(
    payload: StepUpAuthRequest,
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    token = await service.issue_step_up_token(
        user_id=context.user.id,
        password=payload.password,
        action=payload.action,
        resource=payload.target_resource,
        totp_code=payload.totp_code
    )
    return StandardResponse(
        data=StepUpAuthResponse(
            step_up_token=token,
            expires_in=settings.STEP_UP_TOKEN_EXPIRE_MINUTES * 60,
            action=payload.action,
            target_resource=payload.target_resource
        ),
        message="Autorización Step-Up emitida con éxito"
    )
