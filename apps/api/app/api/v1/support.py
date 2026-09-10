import uuid
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.common import StandardResponse, BaseSchema
from app.services.support_service import SupportService
from app.security.deps import (
    CurrentUserContext,
    get_current_user_context,
    require_permissions,
    require_superadmin,
)
from app.core.constants import UserRole
from app.core.exceptions import BadRequestException, ForbiddenException
from app.security.tokens import verify_step_up_token

router = APIRouter(prefix="/support", tags=["Support Desk"])

class TicketCreateInput(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    category: Literal["HACIENDA", "POS", "INVOICING", "INVENTORY", "PAYMENTS", "MIGRATION", "ACCOUNT", "OTHER"] = "OTHER"
    priority: Literal["LOW", "MEDIUM", "NORMAL", "HIGH", "URGENT"] = "NORMAL"
    telemetry: Optional[dict] = None

class MessageCreateInput(BaseModel):
    message: str = Field(min_length=1)
    is_internal_note: bool = False

class DelegatedAccessInput(BaseModel):
    reason: str = Field(min_length=5)
    duration_minutes: int = Field(default=60, ge=15, le=1440)
    permission_level: Literal["READ_ONLY", "FULL_ADMIN"] = "READ_ONLY"

class TicketStatusInput(BaseModel):
    status: Literal["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"]
    reason: Optional[str] = Field(default=None, min_length=5, max_length=500)

class AdminRevokeInput(BaseModel):
    reason: str = Field(min_length=5, max_length=500)

class MessageResponse(BaseSchema):
    id: uuid.UUID
    sender_type: str
    sender_name: str
    message: str
    is_internal_note: bool
    created_at: str

class TicketResponse(BaseSchema):
    id: uuid.UUID
    ticket_number: str
    subject: str
    description: str
    category: str
    priority: str
    status: str
    organization_id: uuid.UUID
    organization_name: str
    created_by_name: str
    created_by_email: str
    telemetry: Optional[dict] = None
    assigned_to_name: Optional[str] = None
    created_at: str
    updated_at: str

def serialize_ticket(ticket) -> TicketResponse:
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        organization_id=ticket.organization_id,
        organization_name=ticket.organization.trade_name,
        created_by_name=ticket.created_by.full_name,
        created_by_email=ticket.created_by.email,
        telemetry=ticket.telemetry_data,
        assigned_to_name=ticket.assigned_to.full_name if ticket.assigned_to else None,
        created_at=ticket.created_at.isoformat(),
        updated_at=ticket.updated_at.isoformat(),
    )

@router.post("/tickets", response_model=StandardResponse[TicketResponse], status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreateInput,
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db)
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")

    service = SupportService(db)
    ticket = await service.create_ticket(
        organization_id=context.organization_id,
        user_id=context.user_id,
        subject=payload.subject,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        telemetry=payload.telemetry
    )
    ticket, _ = await service.get_ticket(
        ticket_id=ticket.id,
        organization_id=context.organization_id,
    )
    return StandardResponse(
        data=serialize_ticket(ticket),
        message="Ticket de soporte creado exitosamente"
    )

@router.get("/tickets", response_model=StandardResponse[List[TicketResponse]])
async def list_my_tickets(
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = SupportService(db)
    is_super = context.role in [UserRole.SUPERADMIN, UserRole.PLATFORM_SUPPORT]
    org_id = None if is_super else context.organization_id
    tickets = await service.list_tickets(organization_id=org_id)

    res_list = [serialize_ticket(t) for t in tickets]
    return StandardResponse(data=res_list)

@router.get("/tickets/{ticket_id}", response_model=StandardResponse[dict])
async def get_ticket_detail(
    ticket_id: uuid.UUID,
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = SupportService(db)
    is_super = context.role in [UserRole.SUPERADMIN, UserRole.PLATFORM_SUPPORT]
    ticket, messages = await service.get_ticket(
        ticket_id=ticket_id,
        organization_id=context.organization_id,
        is_superadmin=is_super
    )

    data = {
        "id": str(ticket.id),
        "ticket_number": ticket.ticket_number,
        "subject": ticket.subject,
        "description": ticket.description,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "organization_id": str(ticket.organization_id),
        "organization_name": ticket.organization.trade_name,
        "created_by_name": ticket.created_by.full_name,
        "created_by_email": ticket.created_by.email,
        "assigned_to_name": ticket.assigned_to.full_name if ticket.assigned_to else None,
        "telemetry": ticket.telemetry_data,
        "created_at": ticket.created_at.isoformat(),
        "updated_at": ticket.updated_at.isoformat(),
        "messages": [
            {
                "id": str(m.id),
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "is_internal_note": m.is_internal_note,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }
    return StandardResponse(data=data)

@router.patch("/tickets/{ticket_id}/status", response_model=StandardResponse[TicketResponse])
async def update_ticket_status(
    ticket_id: uuid.UUID,
    payload: TicketStatusInput,
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    ticket = await SupportService(db).update_ticket_status(
        ticket_id=ticket_id,
        status=payload.status,
        actor_id=context.user_id,
        reason=payload.reason,
    )
    return StandardResponse(data=serialize_ticket(ticket), message="Estado del ticket actualizado")

@router.post("/tickets/{ticket_id}/messages", response_model=StandardResponse[dict])
async def add_ticket_message(
    ticket_id: uuid.UUID,
    payload: MessageCreateInput,
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = SupportService(db)
    msg = await service.add_message(
        ticket_id=ticket_id,
        sender_id=context.user_id,
        sender_role=context.role,
        message=payload.message,
        organization_id=context.organization_id,
        is_internal_note=payload.is_internal_note
    )
    return StandardResponse(
        data={
            "id": str(msg.id),
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "is_internal_note": msg.is_internal_note,
            "created_at": msg.created_at.isoformat()
        },
        message="Mensaje registrado"
    )

@router.post("/delegated-access", response_model=StandardResponse[dict])
async def request_delegated_access(
    payload: DelegatedAccessInput,
    step_up_token: Optional[str] = Header(default=None, alias="X-Step-Up-Token"),
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db)
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")

    if payload.permission_level == "FULL_ADMIN":
        action = "Conceder acceso delegado de administrador"
        resource = f"Tenant #{context.organization_id}"
        if not step_up_token or not verify_step_up_token(
            step_up_token,
            expected_user_id=str(context.user_id),
            expected_action=action,
            expected_resource=resource,
        ):
            raise ForbiddenException(
                "El acceso delegado de administrador requiere reautenticación Step-Up válida"
            )

    service = SupportService(db)
    grant, raw_token = await service.create_delegated_access(
        organization_id=context.organization_id,
        granted_by_user_id=context.user_id,
        reason=payload.reason,
        duration_minutes=payload.duration_minutes,
        permission_level=payload.permission_level
    )
    return StandardResponse(
        data={
            "grant_id": str(grant.id),
            "delegated_token": raw_token,
            "expires_at": grant.expires_at.isoformat(),
            "permission_level": grant.permission_level
        },
        message="Acceso delegado concedido temporalmente para soporte técnico"
    )

@router.get("/admin/delegated-access", response_model=StandardResponse[List[dict]])
async def list_active_delegated_access_for_admin(
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    grants = await SupportService(db).list_active_delegated_access()
    return StandardResponse(data=[{
        "grant_id": str(grant.id),
        "organization_id": str(grant.organization_id),
        "granted_by_user_id": str(grant.granted_by_user_id),
        "support_agent_id": str(grant.support_agent_id) if grant.support_agent_id else None,
        "reason": grant.reason,
        "permission_level": grant.permission_level,
        "expires_at": grant.expires_at.isoformat(),
        "created_at": grant.created_at.isoformat(),
        "is_revoked": grant.is_revoked,
    } for grant in grants])

@router.delete("/admin/delegated-access/{grant_id}", response_model=StandardResponse[dict])
async def revoke_delegated_access_for_admin(
    grant_id: uuid.UUID,
    payload: AdminRevokeInput,
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    grant = await SupportService(db).revoke_delegated_access_as_superadmin(
        grant_id=grant_id,
        actor_id=context.user_id,
        reason=payload.reason,
    )
    return StandardResponse(
        data={"grant_id": str(grant.id), "is_revoked": grant.is_revoked},
        message="Acceso delegado revocado por el administrador",
    )

@router.get("/delegated-access/active", response_model=StandardResponse[Optional[dict]])
async def get_active_delegated_access(
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db),
):
    grant = await SupportService(db).get_active_delegated_access(context.organization_id)
    if not grant:
        return StandardResponse(data=None)
    return StandardResponse(data={
        "grant_id": str(grant.id),
        "reason": grant.reason,
        "permission_level": grant.permission_level,
        "expires_at": grant.expires_at.isoformat(),
        "created_at": grant.created_at.isoformat(),
        "is_revoked": grant.is_revoked,
    })

@router.delete("/delegated-access/{grant_id}", response_model=StandardResponse[dict])
async def revoke_delegated_access(
    grant_id: uuid.UUID,
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db),
):
    grant = await SupportService(db).revoke_delegated_access(
        grant_id=grant_id,
        organization_id=context.organization_id,
        actor_id=context.user_id,
    )
    return StandardResponse(
        data={"grant_id": str(grant.id), "is_revoked": True},
        message="Acceso delegado revocado",
    )
