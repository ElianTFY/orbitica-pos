from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.invoice import InvoiceResponse
from app.schemas.common import StandardResponse
from app.services.invoice_service import InvoiceService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/invoices", tags=["Electronic Invoices"])

@router.get("", response_model=StandardResponse[List[InvoiceResponse]])
async def list_invoices(
    branch_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("invoicing:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = InvoiceService(db, context.organization_id)
    invoices = await service.list_invoices(branch_id=b_id, limit=limit, offset=offset)
    return StandardResponse(data=[InvoiceResponse.model_validate(i) for i in invoices])

@router.post("/{invoice_id}/send-hacienda", response_model=StandardResponse[InvoiceResponse])
async def send_to_hacienda(
    invoice_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("invoicing:manage")),
    db: AsyncSession = Depends(get_db)
):
    service = InvoiceService(db, context.organization_id)
    inv = await service.queue_invoice_for_transmission(invoice_id)
    return StandardResponse(
        data=InvoiceResponse.model_validate(inv),
        message="Comprobante encolado en outbox para transmisión y validación con Hacienda Costa Rica v4.4"
    )
