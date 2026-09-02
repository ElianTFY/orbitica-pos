import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.config import settings

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
        if not settings.HACIENDA_LIVE_EMISSION_ENABLED or not settings.HACIENDA_SANDBOX_VALIDATED:
            raise BadRequestException(
                "La emisión electrónica hacia Hacienda está bloqueada preventivamente hasta completar la validación en ATV Sandbox."
            )

        stmt = select(ElectronicInvoice).where(
            ElectronicInvoice.id == invoice_id,
            ElectronicInvoice.organization_id == self.organization_id
        )
        res = await self.db.execute(stmt)
        inv = res.scalar_one_or_none()
        if not inv:
            raise NotFoundException("Factura electrónica no encontrada")

        if inv.status in ("ACCEPTED", "PROCESSING"):
            raise BadRequestException(f"La factura ya se encuentra en estado '{inv.status}'")

        outbox_entry = HaciendaOutbox(
            organization_id=self.organization_id,
            invoice_id=inv.id,
            document_type=inv.document_type,
            numeric_key=inv.numeric_key,
            consecutive_number=inv.consecutive_number,
            xml_unsigned=inv.xml_unsigned or "",
            xml_signed=inv.xml_signed or "",
            status="QUEUED"
        )
        self.db.add(outbox_entry)
        inv.status = "QUEUED"
        inv.sent_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(inv)
        return inv
