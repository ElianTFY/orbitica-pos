import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update
from app.models.outbox import HaciendaOutbox
from app.models.invoice import ElectronicInvoice
from app.core.exceptions import NotFoundException, BadRequestException

class OutboxService:
    @staticmethod
    async def enqueue_invoice(
        db: AsyncSession,
        organization_id: uuid.UUID,
        branch_id: uuid.UUID,
        invoice_id: uuid.UUID,
        numeric_key: str,
        consecutive_number: str,
        doc_type: str,
        xml_uncompressed: str,
        xml_signed: str
    ) -> HaciendaOutbox:
        """
        Enqueues a signed electronic document into the transactional outbox table
        with initial status PENDING.
        """
        outbox_entry = HaciendaOutbox(
            id=uuid.uuid4(),
            organization_id=organization_id,
            branch_id=branch_id,
            invoice_id=invoice_id,
            numeric_key=numeric_key,
            consecutive_number=consecutive_number,
            doc_type=doc_type,
            xml_uncompressed=xml_uncompressed,
            xml_signed=xml_signed,
            status="PENDING",
            retry_count=0,
            next_retry_at=datetime.now(timezone.utc)
        )
        db.add(outbox_entry)
        await db.flush()
        return outbox_entry

    @staticmethod
    async def get_outbox_by_invoice(
        db: AsyncSession,
        invoice_id: uuid.UUID
    ) -> Optional[HaciendaOutbox]:
        stmt = select(HaciendaOutbox).where(HaciendaOutbox.invoice_id == invoice_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def requeue_stuck_events(
        db: AsyncSession,
        stuck_minutes: int = 15
    ) -> int:
        """
        Requeues events stuck in PROCESSING or SENT due to worker unexpected crash.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=stuck_minutes)
        stmt = (
            update(HaciendaOutbox)
            .where(
                HaciendaOutbox.status.in_(["PROCESSING", "SENT"]),
                HaciendaOutbox.updated_at < cutoff
            )
            .values(
                status="PENDING",
                next_retry_at=datetime.now(timezone.utc),
                last_error="Reencolado automático: tiempo límite de procesamiento excedido"
            )
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount
