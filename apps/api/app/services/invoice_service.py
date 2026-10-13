import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.config import settings
from app.services.electronic_invoicing_service import ElectronicInvoicingService
from app.services.outbox_service import OutboxService
from app.services.fiscal_readiness import require_live_readiness

class InvoiceService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_invoices(self, branch_id: Optional[uuid.UUID] = None, limit: int = 50, offset: int = 0) -> List[ElectronicInvoice]:
        stmt = select(ElectronicInvoice).where(
            ElectronicInvoice.organization_id == self.organization_id
        )
        if branch_id:
            stmt = stmt.where(ElectronicInvoice.branch_id == branch_id)
        stmt = stmt.order_by(desc(ElectronicInvoice.created_at)).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def queue_invoice_for_transmission(self, invoice_id: uuid.UUID) -> ElectronicInvoice:
        """
        Enqueues an electronic invoice into the transactional HaciendaOutbox.
        Prohibits simulated local acceptance transitions and respects production safety blocks.
        """
        # Keep the same lock order as worker, refunds and status polling.
        existing = (await self.db.execute(select(HaciendaOutbox).where(
            HaciendaOutbox.invoice_id == invoice_id,
            HaciendaOutbox.organization_id == self.organization_id,
        ).with_for_update())).scalar_one_or_none()
        inv = (await self.db.execute(select(ElectronicInvoice).where(
            ElectronicInvoice.id == invoice_id,
            ElectronicInvoice.organization_id == self.organization_id,
        ).with_for_update())).scalar_one_or_none()
        if not inv:
            raise NotFoundException("Factura electrónica no encontrada")
        await require_live_readiness(self.db, self.organization_id, inv.environment)
        if existing and existing.status in {"PENDING", "QUEUED", "PROCESSING", "SENT", "ACCEPTED"} and inv.xml_signed:
            return inv
        if inv.status in {"ACCEPTED", "REJECTED", "CANCELLED"}:
            raise BadRequestException(f"No se puede reenviar un comprobante con estado '{inv.status}'")
        if inv.sent_to_hacienda_at:
            if not existing:
                raise BadRequestException("Falta el evento fiscal del comprobante transmitido")
            existing.status = "SENT"
            existing.next_retry_at = datetime.now(timezone.utc)
            inv.status = "PROCESSING"
        else:
            if not inv.xml_signed:
                inv = await ElectronicInvoicingService(self.db).prepare_and_sign_invoice(inv.id, self.organization_id)
            if not existing:
                existing = await OutboxService.enqueue_invoice(
                    self.db, self.organization_id, inv.branch_id, inv.id,
                    inv.numeric_key, inv.consecutive_number, inv.doc_type,
                    inv.xml_generated or "", inv.xml_signed or "",
                )
            else:
                existing.xml_uncompressed = inv.xml_generated or ""
                existing.xml_signed = inv.xml_signed or ""
                existing.status = "PENDING"
                existing.retry_count = 0
                existing.next_retry_at = datetime.now(timezone.utc)
                existing.last_error = None
            inv.status = "QUEUED"
        await self.db.commit()
        await self.db.refresh(inv)
        return inv
