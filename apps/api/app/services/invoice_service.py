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
        stmt = select(ElectronicInvoice).where(
            ElectronicInvoice.id == invoice_id,
            ElectronicInvoice.organization_id == self.organization_id
        ).with_for_update()
        res = await self.db.execute(stmt)
        inv = res.scalar_one_or_none()
        if not inv:
            raise NotFoundException("Factura electrónica no encontrada")

        if inv.environment == "PRODUCTION" and (
            not settings.HACIENDA_LIVE_EMISSION_ENABLED
            or not settings.HACIENDA_SANDBOX_VALIDATED
        ):
            raise BadRequestException(
                "La emisión en producción está bloqueada hasta completar Sandbox y habilitar explícitamente la transmisión en vivo."
            )

        existing = await OutboxService.get_outbox_by_invoice(self.db, inv.id)
        if existing:
            if existing.status in {"PENDING", "QUEUED", "PROCESSING", "SENT", "ACCEPTED"}:
                return inv
            if existing.status in {"ERROR", "CONTINGENCY"}:
                existing.status = "PENDING"
                existing.retry_count = 0
                existing.next_retry_at = datetime.now(timezone.utc)
                existing.last_error = None
                inv.status = "QUEUED"
                await self.db.commit()
                await self.db.refresh(inv)
                return inv
            raise BadRequestException(
                f"El comprobante ya tiene un evento fiscal con estado '{existing.status}'"
            )

        if inv.status not in {"DRAFT", "SIGNED"}:
            raise BadRequestException(f"No se puede encolar una factura con estado '{inv.status}'")

        if not inv.xml_signed:
            inv = await ElectronicInvoicingService(self.db).prepare_and_sign_invoice(
                inv.id, self.organization_id
            )

        await OutboxService.enqueue_invoice(
            db=self.db,
            organization_id=self.organization_id,
            branch_id=inv.branch_id,
            invoice_id=inv.id,
            numeric_key=inv.numeric_key,
            consecutive_number=inv.consecutive_number,
            doc_type=inv.doc_type,
            xml_uncompressed=inv.xml_generated or "",
            xml_signed=inv.xml_signed or "",
        )
        inv.status = "QUEUED"

        await self.db.commit()
        await self.db.refresh(inv)
        return inv
