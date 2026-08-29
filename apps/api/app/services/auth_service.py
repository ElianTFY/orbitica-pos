import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserSession
from app.security.password import verify_password
from app.security.tokens import create_access_token, generate_refresh_token, hash_token
from app.core.exceptions import UnauthorizedException, AccountLockedException
from app.core.config import settings
from app.services.audit_service import AuditService

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str, str]:
        stmt = select(User).where(User.email == email.strip().lower())
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if not user:
            raise UnauthorizedException("Credenciales incorrectas")

        if not user.is_active:
            raise UnauthorizedException("Usuario deshabilitado")

        if user.locked_until:
            user_lock = user.locked_until
            if user_lock.tzinfo is None:
                user_lock = user_lock.replace(tzinfo=timezone.utc)
            if user_lock > now:
                raise AccountLockedException(f"Cuenta bloqueada temporalmente por intentos fallidos")

        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
                await self.db.commit()
                raise AccountLockedException(f"Cuenta bloqueada por {settings.LOCKOUT_MINUTES} minutos debido a múltiples intentos fallidos")
            await self.db.commit()
            raise UnauthorizedException("Credenciales incorrectas")

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

        stmt = select(UserSession).where(
            UserSession.refresh_token_hash == token_hash,
            UserSession.revoked_at.is_(None)
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise UnauthorizedException("Sesión inválida o expirada")

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
