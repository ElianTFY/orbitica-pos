import uuid
import pyotp
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.user import User, UserSession
from app.security.password import verify_password, hash_password
from app.security.tokens import (
    create_access_token,
    generate_refresh_token,
    generate_recovery_token,
    generate_numeric_code,
    hash_token,
    create_step_up_token,
    verify_step_up_token,
)
from app.core.constants import UserRole, ASSIGNABLE_ROLES
from app.core.exceptions import UnauthorizedException, AccountLockedException, ForbiddenException, BadRequestException
from app.core.config import settings
from app.services.audit_service import AuditService
from app.adapters.email_adapter import get_email_adapter

# In-memory IP-based rate limiting
_IP_LOGIN_ATTEMPTS: Dict[str, List[datetime]] = {}

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _check_ip_rate_limit(self, ip_address: Optional[str]):
        if not ip_address:
            return
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=15)
        attempts = [t for t in _IP_LOGIN_ATTEMPTS.get(ip_address, []) if t > cutoff]
        _IP_LOGIN_ATTEMPTS[ip_address] = attempts
        if len(attempts) >= 25:
            raise AccountLockedException("Demasiados intentos fallidos desde esta dirección IP. Intente de nuevo en 15 minutos.")

    def _record_ip_failed_attempt(self, ip_address: Optional[str]):
        if not ip_address:
            return
        now = datetime.now(timezone.utc)
        if ip_address not in _IP_LOGIN_ATTEMPTS:
            _IP_LOGIN_ATTEMPTS[ip_address] = []
        _IP_LOGIN_ATTEMPTS[ip_address].append(now)

    async def authenticate_user(
        self,
        email: str,
        password: str,
        totp_code: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str, str]:
        self._check_ip_rate_limit(ip_address)

        stmt = select(User).where(User.email == email.strip().lower())
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if not user:
            self._record_ip_failed_attempt(ip_address)
            raise UnauthorizedException("Credenciales incorrectas")

        if not user.is_active:
            raise UnauthorizedException("Usuario deshabilitado")

        if user.locked_until:
            user_lock = user.locked_until
            if user_lock.tzinfo is None:
                user_lock = user_lock.replace(tzinfo=timezone.utc)
            if user_lock > now:
                raise AccountLockedException("Cuenta bloqueada temporalmente por múltiples intentos fallidos")

        if not verify_password(password, user.password_hash):
            self._record_ip_failed_attempt(ip_address)
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
                await self.db.commit()
                raise AccountLockedException(f"Cuenta bloqueada por {settings.LOCKOUT_MINUTES} minutos debido a múltiples intentos fallidos")
            await self.db.commit()
            raise UnauthorizedException("Credenciales incorrectas")

        # Strict TOTP MFA enforcement for Superadmin or users with TOTP enabled
        if user.role == UserRole.SUPERADMIN:
            if not user.totp_enabled:
                if not user.totp_secret:
                    user.totp_secret = pyotp.random_base32()
                    user.totp_enabled = False
                    await self.db.commit()

                if totp_code:
                    totp = pyotp.TOTP(user.totp_secret)
                    if not totp.verify(totp_code.strip(), valid_window=1):
                        self._record_ip_failed_attempt(ip_address)
                        raise UnauthorizedException("Código TOTP de activación incorrecto o expirado")
                    user.totp_enabled = True
                    await self.db.commit()
                else:
                    # Enforce MFA challenge: Block Superadmin until first code is verified
                    prov_uri = pyotp.TOTP(user.totp_secret).provisioning_uri(
                        name=user.email,
                        issuer_name="Orbítica POS Superadmin"
                    )
                    raise UnauthorizedException(
                        f"MFA_ENROLLMENT_REQUIRED: Debe configurar y verificar su primer código TOTP antes de iniciar sesión. URI: {prov_uri}"
                    )
            else:
                if not totp_code:
                    raise UnauthorizedException("Código de autenticación en dos pasos (TOTP MFA) requerido")
                totp = pyotp.TOTP(user.totp_secret)
                if not totp.verify(totp_code.strip(), valid_window=1):
                    self._record_ip_failed_attempt(ip_address)
                    user.failed_login_attempts += 1
                    await self.db.commit()
                    raise UnauthorizedException("Código TOTP MFA incorrecto o expirado")

        elif user.totp_enabled:
            if not totp_code:
                raise UnauthorizedException("Código de autenticación en dos pasos (TOTP MFA) requerido")
            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(totp_code.strip(), valid_window=1):
                self._record_ip_failed_attempt(ip_address)
                user.failed_login_attempts += 1
                await self.db.commit()
                raise UnauthorizedException("Código TOTP MFA incorrecto o expirado")

        # Success -> Reset failed attempts
        user.failed_login_attempts = 0
        user.locked_until = None

        access_token = create_access_token(
            subject=str(user.id),
            claims={
                "org_id": str(user.organization_id) if user.organization_id else None,
                "role": user.role,
                "email": user.email
            }
        )

        raw_refresh_token = generate_refresh_token()
        refresh_hash = hash_token(raw_refresh_token)
        session_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        session = UserSession(
            user_id=user.id,
            family_id=uuid.uuid4(),
            refresh_token_hash=refresh_hash,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=session_expires_at
        )
        self.db.add(session)
        
        await AuditService.log_action(
            db=self.db,
            action="LOGIN_SUCCESS",
            resource="User",
            actor_id=user.id,
            organization_id=user.organization_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        await self.db.commit()
        return user, access_token, raw_refresh_token

    async def rotate_refresh_token(
        self,
        raw_refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str, str]:
        token_hash = hash_token(raw_refresh_token)
        now = datetime.now(timezone.utc)

        # SELECT FOR UPDATE when supported (PostgreSQL concurrency safety)
        revoked_stmt = select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        bind = self.db.bind
        if bind and "postgres" in bind.dialect.name.lower():
            revoked_stmt = revoked_stmt.with_for_update()

        revoked_res = await self.db.execute(revoked_stmt)
        existing_session = revoked_res.scalar_one_or_none()

        if existing_session and existing_session.revoked_at is not None:
            # Token reuse detected! Revoke whole family immediately
            await self.db.execute(
                update(UserSession)
                .where(UserSession.family_id == existing_session.family_id)
                .values(revoked_at=now)
            )
            await self.db.commit()
            raise UnauthorizedException("Detección de reutilización de refresh token. Todas las sesiones de la familia han sido revocadas por seguridad.")

        if not existing_session:
            raise UnauthorizedException("Sesión inválida o expirada")

        session = existing_session

        session_exp = session.expires_at
        if session_exp.tzinfo is None:
            session_exp = session_exp.replace(tzinfo=timezone.utc)
        if session_exp <= now:
            raise UnauthorizedException("Sesión expirada")

        session.revoked_at = now

        user_stmt = select(User).where(User.id == session.user_id, User.is_active == True)
        user_res = await self.db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user:
            raise UnauthorizedException("Usuario no encontrado")

        access_token = create_access_token(
            subject=str(user.id),
            claims={
                "org_id": str(user.organization_id) if user.organization_id else None,
                "role": user.role,
                "email": user.email
            }
        )
        new_raw_refresh = generate_refresh_token()
        new_session = UserSession(
            user_id=user.id,
            family_id=session.family_id,
            parent_token_hash=token_hash,
            refresh_token_hash=hash_token(new_raw_refresh),
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        self.db.add(new_session)
        await self.db.commit()

        return user, access_token, new_raw_refresh

    async def revoke_session(self, raw_refresh_token: str) -> None:
        token_hash = hash_token(raw_refresh_token)
        stmt = select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def enroll_totp(self, user_id: uuid.UUID) -> Dict[str, str]:
        stmt = select(User).where(User.id == user_id, User.is_active == True)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("Usuario no encontrado")

        secret = pyotp.random_base32()
        user.totp_secret = secret
        user.totp_enabled = False  # Must be confirmed with activate_totp
        await self.db.commit()

        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="Orbitica POS"
        )
        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri
        }

    async def activate_totp(self, user_id: uuid.UUID, totp_code: str) -> bool:
        stmt = select(User).where(User.id == user_id, User.is_active == True)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user or not user.totp_secret:
            raise BadRequestException("No hay enrolamiento de TOTP pendiente")

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(totp_code.strip(), valid_window=1):
            raise UnauthorizedException("Código TOTP inválido")

        user.totp_enabled = True
        await self.db.commit()
        return True

    async def request_password_recovery(self, email: str) -> str:
        stmt = select(User).where(User.email == email.strip().lower(), User.is_active == True)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            return "ok"

        raw_token = generate_recovery_token()
        user.recovery_token_hash = hash_token(raw_token)
        user.recovery_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await self.db.commit()

        email_adapter = get_email_adapter()
        base_frontend = settings.FRONTEND_URL.rstrip('/')
        recovery_url = f"{base_frontend}/reset-password?token={raw_token}"
        await email_adapter.send_email(
            to_email=user.email,
            subject="Recuperación de Contraseña — Orbítica POS",
            html_content=f"<p>Hola {user.full_name},</p><p>Has solicitado restablecer tu contraseña en Orbítica POS. Usa este enlace para completar el cambio:</p><p><a href='{recovery_url}'>{recovery_url}</a></p><p>Este enlace expirará en 1 hora.</p>",
            text_content=f"Hola {user.full_name},\n\nPara restablecer tu contraseña en Orbítica POS, ingresa al siguiente enlace:\n{recovery_url}\n\nVálido por 1 hora."
        )
        return raw_token

    async def reset_password_with_token(self, raw_token: str, new_password: str) -> bool:
        token_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)
        stmt = select(User).where(
            User.recovery_token_hash == token_hash,
            User.recovery_token_expires_at > now,
            User.is_active == True
        )
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("Token de recuperación inválido o expirado")

        user.password_hash = hash_password(new_password)
        user.recovery_token_hash = None
        user.recovery_token_expires_at = None
        user.failed_login_attempts = 0
        user.locked_until = None

        # Revoke all active sessions on password reset
        await self.db.execute(
            update(UserSession).where(UserSession.user_id == user.id).values(revoked_at=now)
        )
        await self.db.commit()
        return True

    async def request_email_verification(self, user_id: uuid.UUID) -> str:
        stmt = select(User).where(User.id == user_id)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("Usuario no encontrado")

        code = generate_numeric_code(6)
        user.email_verification_code = code
        user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        user.email_verification_attempts = 0
        await self.db.commit()
        return code

    async def verify_email_code(self, user_id: uuid.UUID, code: str) -> bool:
        stmt = select(User).where(User.id == user_id)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("Usuario no encontrado")

        now = datetime.now(timezone.utc)
        if user.email_verification_attempts >= 3:
            raise ForbiddenException("Límite de intentos de verificación excedido. Solicita un nuevo código.")

        user.email_verification_attempts += 1

        if not user.email_verification_code or not user.email_verification_expires_at or user.email_verification_expires_at < now:
            await self.db.commit()
            raise UnauthorizedException("El código de verificación ha expirado")

        if user.email_verification_code != code.strip():
            await self.db.commit()
            raise UnauthorizedException("Código de verificación incorrecto")

        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_expires_at = None
        await self.db.commit()
        return True

    async def verify_email_by_email(self, email: str, code: str) -> bool:
        stmt = select(User).where(func.lower(User.email) == email.strip().lower(), User.is_active == True)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("Usuario o código de verificación inválido")
        return await self.verify_email_code(user.id, code)

    async def issue_step_up_token(
        self,
        user_id: uuid.UUID,
        password: str,
        action: str,
        resource: str,
        totp_code: Optional[str] = None
    ) -> str:
        stmt = select(User).where(User.id == user_id, User.is_active == True)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise UnauthorizedException("Usuario no encontrado")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedException("Contraseña de reautenticación incorrecta")

        if user.totp_enabled and user.totp_secret:
            if not totp_code:
                raise UnauthorizedException("Código TOTP requerido para Step-Up")
            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(totp_code, valid_window=1):
                raise UnauthorizedException("Código TOTP inválido")

        return create_step_up_token(
            user_id=str(user.id),
            action=action,
            resource=resource,
            expires_minutes=settings.STEP_UP_TOKEN_EXPIRE_MINUTES
        )

    def validate_role_assignment(self, actor_role: UserRole, target_role: UserRole) -> None:
        allowed_roles = ASSIGNABLE_ROLES.get(actor_role, set())
        if target_role not in allowed_roles:
            raise ForbiddenException(
                f"El rol '{actor_role}' no tiene autorización para asignar o crear usuarios con rol '{target_role}'."
            )
