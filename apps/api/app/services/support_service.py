import uuid
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.models.support import SupportTicket, SupportMessage, DelegatedAccessGrant
from app.models.user import User
from app.models.organization import Organization
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.core.constants import UserRole
from app.services.audit_service import AuditService

class SupportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_ticket(
        self,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        subject: str,
        description: str,
        category: str = "OTHER",
        priority: str = "NORMAL",
        telemetry: Optional[dict] = None
    ) -> SupportTicket:
        # 48 bits of cryptographic entropy make collisions negligible while
        # remaining within the 20-character database limit.
        ticket_num = f"TCK-{secrets.token_hex(6).upper()}"

        ticket = SupportTicket(
            organization_id=organization_id,
            created_by_user_id=user_id,
            ticket_number=ticket_num,
            category=category,
            priority=priority,
            status="OPEN",
            subject=subject.strip(),
            description=description.strip(),
            telemetry_data=telemetry
        )
        self.db.add(ticket)
        await self.db.flush()

        msg = SupportMessage(
            ticket_id=ticket.id,
            sender_id=user_id,
            sender_type="CLIENT",
            sender_name="Cliente",
            message=description.strip(),
            is_internal_note=False
        )
        self.db.add(msg)

        await AuditService.log_action(
            db=self.db,
            action="SUPPORT_TICKET_CREATED",
            resource="SupportTicket",
            actor_id=user_id,
            organization_id=organization_id,
            resource_id=str(ticket.id),
            payload_after={"ticket_number": ticket_num, "subject": subject}
        )

        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def list_tickets(
        self,
        organization_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None
    ) -> List[SupportTicket]:
        stmt = (
            select(SupportTicket)
            .options(
                selectinload(SupportTicket.organization),
                selectinload(SupportTicket.created_by),
                selectinload(SupportTicket.assigned_to),
            )
            .order_by(desc(SupportTicket.updated_at))
        )
        if organization_id:
            stmt = stmt.where(SupportTicket.organization_id == organization_id)
        if status:
            stmt = stmt.where(SupportTicket.status == status)

        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_ticket(
        self,
        ticket_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None,
        is_superadmin: bool = False
    ) -> Tuple[SupportTicket, List[SupportMessage]]:
        stmt = (
            select(SupportTicket)
            .options(
                selectinload(SupportTicket.organization),
                selectinload(SupportTicket.created_by),
                selectinload(SupportTicket.assigned_to),
            )
            .where(SupportTicket.id == ticket_id)
        )
        if organization_id and not is_superadmin:
            stmt = stmt.where(SupportTicket.organization_id == organization_id)

        res = await self.db.execute(stmt)
        ticket = res.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Ticket de soporte no encontrado")

        msg_stmt = (
            select(SupportMessage)
            .where(SupportMessage.ticket_id == ticket.id)
            .order_by(SupportMessage.created_at.asc())
        )
        if not is_superadmin:
            msg_stmt = msg_stmt.where(SupportMessage.is_internal_note == False)

        msg_res = await self.db.execute(msg_stmt)
        messages = list(msg_res.scalars().all())

        return ticket, messages

    async def update_ticket_status(
        self,
        ticket_id: uuid.UUID,
        status: str,
        actor_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> SupportTicket:
        ticket = (await self.db.execute(
            select(SupportTicket)
            .options(
                selectinload(SupportTicket.organization),
                selectinload(SupportTicket.created_by),
                selectinload(SupportTicket.assigned_to),
            )
            .where(SupportTicket.id == ticket_id)
            .with_for_update()
        )).scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Ticket de soporte no encontrado")

        previous_status = ticket.status
        ticket.status = status
        await AuditService.log_action(
            db=self.db,
            action="SUPPORT_TICKET_STATUS_UPDATED",
            resource="SupportTicket",
            actor_id=actor_id,
            organization_id=ticket.organization_id,
            resource_id=str(ticket.id),
            reason=reason or f"Estado cambiado de {previous_status} a {status}",
            payload_before={"status": previous_status},
            payload_after={"status": status},
        )
        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def add_message(
        self,
        ticket_id: uuid.UUID,
        sender_id: uuid.UUID,
        sender_role: UserRole,
        message: str,
        organization_id: Optional[uuid.UUID] = None,
        is_internal_note: bool = False
    ) -> SupportMessage:
        stmt = select(SupportTicket).where(SupportTicket.id == ticket_id)
        res = await self.db.execute(stmt)
        ticket = res.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Ticket no encontrado")

        # Multi-tenant isolation: non-superadmin clients can only post to their own organization's tickets
        if sender_role not in [UserRole.SUPERADMIN, UserRole.PLATFORM_SUPPORT]:
            if not organization_id or ticket.organization_id != organization_id:
                raise ForbiddenException("Acceso denegado: el ticket pertenece a otra organización")

        if is_internal_note and sender_role not in [UserRole.SUPERADMIN, UserRole.PLATFORM_SUPPORT]:
            raise ForbiddenException("Solo el equipo de soporte de la plataforma puede agregar notas internas")

        u_stmt = select(User).where(User.id == sender_id)
        u_res = await self.db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        sender_name = user.full_name if user else "Usuario"

        sender_type = "SUPPORT_AGENT" if sender_role in [UserRole.SUPERADMIN, UserRole.PLATFORM_SUPPORT] else "CLIENT"

        msg = SupportMessage(
            ticket_id=ticket.id,
            sender_id=sender_id,
            sender_type=sender_type,
            sender_name=sender_name,
            message=message.strip(),
            is_internal_note=is_internal_note
        )
        self.db.add(msg)

        if sender_type == "SUPPORT_AGENT" and ticket.status == "OPEN":
            ticket.status = "IN_PROGRESS"

        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def create_delegated_access(
        self,
        organization_id: uuid.UUID,
        granted_by_user_id: uuid.UUID,
        reason: str,
        duration_minutes: int = 60,
        permission_level: str = "READ_ONLY"
    ) -> Tuple[DelegatedAccessGrant, str]:
        # Serialize replacement even when there are no active grants yet.
        organization = (await self.db.execute(
            select(Organization).where(Organization.id == organization_id).with_for_update()
        )).scalar_one_or_none()
        if not organization:
            raise NotFoundException("Organización no encontrada")
        now = datetime.now(timezone.utc)
        active_grants = list((await self.db.execute(
            select(DelegatedAccessGrant)
            .where(
                DelegatedAccessGrant.organization_id == organization_id,
                DelegatedAccessGrant.is_revoked == False,
                DelegatedAccessGrant.expires_at > now,
            )
            .with_for_update()
        )).scalars().all())
        for active_grant in active_grants:
            active_grant.is_revoked = True
            active_grant.revoked_at = now
            active_grant.revoked_reason = "Reemplazado por una nueva autorización del comercio"

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        exp = now + timedelta(minutes=duration_minutes)

        grant = DelegatedAccessGrant(
            organization_id=organization_id,
            granted_by_user_id=granted_by_user_id,
            reason=reason.strip(),
            permission_level=permission_level,
            token_hash=token_hash,
            expires_at=exp,
            is_revoked=False
        )
        self.db.add(grant)

        await AuditService.log_action(
            db=self.db,
            action="DELEGATED_ACCESS_GRANTED",
            resource="DelegatedAccessGrant",
            actor_id=granted_by_user_id,
            organization_id=organization_id,
            reason=reason,
            payload_after={
                "permission_level": permission_level,
                "duration_minutes": duration_minutes,
                "replaced_grant_ids": [str(item.id) for item in active_grants],
            }
        )

        await self.db.commit()
        await self.db.refresh(grant)
        return grant, raw_token

    async def get_active_delegated_access(
        self,
        organization_id: uuid.UUID,
    ) -> Optional[DelegatedAccessGrant]:
        now = datetime.now(timezone.utc)
        return (await self.db.execute(
            select(DelegatedAccessGrant)
            .where(
                DelegatedAccessGrant.organization_id == organization_id,
                DelegatedAccessGrant.is_revoked == False,
                DelegatedAccessGrant.expires_at > now,
            )
            .order_by(DelegatedAccessGrant.created_at.desc())
            .limit(1)
        )).scalar_one_or_none()

    async def list_active_delegated_access(self) -> List[DelegatedAccessGrant]:
        now = datetime.now(timezone.utc)
        return list((await self.db.execute(
            select(DelegatedAccessGrant)
            .where(
                DelegatedAccessGrant.is_revoked == False,
                DelegatedAccessGrant.expires_at > now,
            )
            .order_by(DelegatedAccessGrant.created_at.desc())
        )).scalars().all())

    async def revoke_delegated_access(
        self,
        grant_id: uuid.UUID,
        organization_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> DelegatedAccessGrant:
        grant = (await self.db.execute(
            select(DelegatedAccessGrant).where(
                DelegatedAccessGrant.id == grant_id,
                DelegatedAccessGrant.organization_id == organization_id,
            ).with_for_update()
        )).scalar_one_or_none()
        if not grant:
            raise NotFoundException("Acceso delegado no encontrado")
        if not grant.is_revoked:
            grant.is_revoked = True
            grant.revoked_at = datetime.now(timezone.utc)
            grant.revoked_reason = "Revocado por el comercio"
            await AuditService.log_action(
                db=self.db,
                action="DELEGATED_ACCESS_REVOKED",
                resource="DelegatedAccessGrant",
                actor_id=actor_id,
                organization_id=organization_id,
                resource_id=str(grant.id),
                reason=grant.revoked_reason,
            )
            await self.db.commit()
            await self.db.refresh(grant)
        return grant

    async def revoke_delegated_access_as_superadmin(
        self,
        grant_id: uuid.UUID,
        actor_id: uuid.UUID,
        reason: str,
    ) -> DelegatedAccessGrant:
        grant = (await self.db.execute(
            select(DelegatedAccessGrant)
            .where(DelegatedAccessGrant.id == grant_id)
            .with_for_update()
        )).scalar_one_or_none()
        if not grant:
            raise NotFoundException("Acceso delegado no encontrado")
        if not grant.is_revoked:
            grant.is_revoked = True
            grant.revoked_at = datetime.now(timezone.utc)
            grant.revoked_reason = reason.strip()
            await AuditService.log_action(
                db=self.db,
                action="DELEGATED_ACCESS_ADMIN_REVOKED",
                resource="DelegatedAccessGrant",
                actor_id=actor_id,
                organization_id=grant.organization_id,
                resource_id=str(grant.id),
                reason=grant.revoked_reason,
            )
            await self.db.commit()
            await self.db.refresh(grant)
        return grant
