import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.invoice import ElectronicInvoice
from app.schemas.invoice import InvoiceStatusUpdate
from app.core.exceptions import NotFoundException

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

    async def send_to_hacienda_simulated(self, invoice_id: uuid.UUID) -> ElectronicInvoice:
        stmt = select(ElectronicInvoice).where(
            ElectronicInvoice.id == invoice_id,
            ElectronicInvoice.organization_id == self.organization_id
        )
        res = await self.db.execute(stmt)
        inv = res.scalar_one_or_none()
        if not inv:
            raise NotFoundException("Factura electrónica no encontrada")

        inv.status = "ACCEPTED"
        inv.sent_at = datetime.now(timezone.utc)
        inv.hacienda_response_code = "1"
        inv.hacienda_response_detail = "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.3"

        await self.db.commit()
        await self.db.refresh(inv)
        return inv
