from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.cash_register import (
    CashRegisterCreate,
    CashRegisterResponse,
    SessionOpenRequest,
    SessionCloseRequest,
    CashSessionResponse
)
from app.schemas.common import StandardResponse
from app.services.cash_register_service import CashRegisterService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/cash-registers", tags=["Cash Registers"])

@router.get("", response_model=StandardResponse[List[CashRegisterResponse]])
async def list_registers(
    branch_id: Optional[UUID] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("branch:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = CashRegisterService(db, context.organization_id)
    registers = await service.list_registers(branch_id=b_id)
    return StandardResponse(data=[CashRegisterResponse.model_validate(r) for r in registers])

@router.post("", response_model=StandardResponse[CashRegisterResponse], status_code=status.HTTP_201_CREATED)
async def create_register(
    payload: CashRegisterCreate,
    context: CurrentUserContext = Depends(require_permissions("cash:manage")),
    db: AsyncSession = Depends(get_db)
):
    service = CashRegisterService(db, context.organization_id)
    reg = await service.create_register(payload)
    return StandardResponse(data=CashRegisterResponse.model_validate(reg), message="Caja registradora creada")

@router.post("/sessions/open", response_model=StandardResponse[CashSessionResponse], status_code=status.HTTP_201_CREATED)
async def open_session(
    payload: SessionOpenRequest,
    context: CurrentUserContext = Depends(require_permissions("cash:open")),
    db: AsyncSession = Depends(get_db)
):
    service = CashRegisterService(db, context.organization_id)
    session = await service.open_session(payload, user_id=context.user_id)
    return StandardResponse(
        data=CashSessionResponse.model_validate(session),
        message="Turno de caja abierto exitosamente"
    )

@router.get("/sessions/active", response_model=StandardResponse[Optional[CashSessionResponse]])
async def get_active_session(
    context: CurrentUserContext = Depends(require_permissions("cash:open")),
    db: AsyncSession = Depends(get_db)
):
    service = CashRegisterService(db, context.organization_id)
    active = await service.get_active_session(user_id=context.user_id)
    if not active:
        return StandardResponse(data=None)
    return StandardResponse(data=CashSessionResponse.model_validate(active))

@router.post("/sessions/{session_id}/close", response_model=StandardResponse[CashSessionResponse])
async def close_session(
    session_id: UUID,
    payload: SessionCloseRequest,
    context: CurrentUserContext = Depends(require_permissions("cash:close")),
    db: AsyncSession = Depends(get_db)
):
    service = CashRegisterService(db, context.organization_id)
    session = await service.close_session(session_id, payload, actor_id=context.user_id)
    return StandardResponse(
        data=CashSessionResponse.model_validate(session),
        message="Turno de caja cerrado y arqueado correctamente"
    )
