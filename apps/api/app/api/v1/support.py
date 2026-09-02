import uuid
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.common import StandardResponse, BaseSchema
from app.services.support_service import SupportService
from app.security.deps import CurrentUserContext, get_current_user_context
from app.core.constants import UserRole
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/support", tags=["Support Desk"])

class TicketCreateInput(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    category: str = Field(default="OTHER")
    priority: str = Field(default="NORMAL")
    telemetry: Optional[dict] = None

class MessageCreateInput(BaseModel):
    message: str = Field(min_length=1)
    is_internal_note: bool = False

class DelegatedAccessInput(BaseModel):
    reason: str = Field(min_length=5)
    duration_minutes: int = Field(default=60, ge=15, le=1440)
    permission_level: str = Field(default="READ_ONLY")

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
    created_at: str

@router.post("/tickets", response_model=StandardResponse[TicketResponse], status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreateInput,
    context: CurrentUserContext = Depends(get_current_user_context),
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
    return StandardResponse(
        data=TicketResponse(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            subject=ticket.subject,
            description=ticket.description,
            category=ticket.category,
            priority=ticket.priority,
            status=ticket.status,
            created_at=ticket.created_at.isoformat()
        ),
        message="Ticket de soporte creado exitosamente"
    )

@router.get("/tickets", response_model=StandardResponse[List[TicketResponse]])
async def list_my_tickets(
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    service = SupportService(db)
    is_super = context.role == UserRole.SUPERADMIN
    org_id = None if is_super else context.organization_id
    tickets = await service.list_tickets(organization_id=org_id)

    res_list = [
        TicketResponse(
            id=t.id,
            ticket_number=t.ticket_number,
            subject=t.subject,
            description=t.description,
            category=t.category,
            priority=t.priority,
            status=t.status,
            created_at=t.created_at.isoformat()
        )
        for t in tickets
    ]
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
        "created_at": ticket.created_at.isoformat(),
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
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")

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
