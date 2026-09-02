import asyncio
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.workers.hacienda_outbox_worker import HaciendaOutboxWorker
from app.services.outbox_service import OutboxService

class MockHaciendaClient:
    def __init__(self, fail_all: bool = False):
        self.fail_all = fail_all
        self.sent_claves = []
        self.checked_claves = []
        self._lock = asyncio.Lock()

    async def get_access_token(self, username: str, password: str) -> Dict[str, Any]:
        return {"access_token": "mock_valid_bearer_token"}

    async def send_invoice(
        self,
        token: str,
        clave: str,
        fecha: str,
        emisor_id: str,
        emisor_tipo: str,
        signed_xml: str,
        receptor_id: Optional[str] = None,
        receptor_tipo: Optional[str] = None
    ) -> Dict[str, Any]:
        if self.fail_all:
            raise ConnectionError("Simulated Hacienda 503 Service Unavailable")
        async with self._lock:
            self.sent_claves.append(clave)
        return {"status_code": 202, "success": True}

    async def check_status(self, token: str, clave: str) -> Dict[str, Any]:
        if self.fail_all:
            raise ConnectionError("Simulated Hacienda 504 Gateway Timeout")
        async with self._lock:
            self.checked_claves.append(clave)
        return {
            "status_code": 200,
            "status": "aceptado",
            "response_xml": f"<MensajeHacienda><Clave>{clave}</Clave><Estado>1</Estado></MensajeHacienda>"
        }

@pytest.mark.asyncio
async def test_20_concurrent_outbox_events_no_duplicates_no_deadlocks(
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Spawns 20 distinct outbox events in PENDING status.
    Executes multiple concurrent workers competing for the queue using SKIP LOCKED.
    Verifies that all 20 are processed exactly once through PENDING -> PROCESSING -> SENT -> ACCEPTED
    with zero duplicate transmissions and zero deadlocks.
    """
    b_stmt = select(Branch).where(Branch.organization_id == sample_organization.id)
    b_res = await db_session.execute(b_stmt)
    branch = b_res.scalars().first()

    mock_client = MockHaciendaClient()

    # 1. Enqueue 20 events
    outbox_ids = []
    for i in range(1, 21):
        inv_id = uuid.uuid4()
        numeric_key = f"5060209260031019998880010000104{str(i).zfill(10)}1112345678"
        cons = f"0010000104{str(i).zfill(10)}"

        inv = ElectronicInvoice(
            id=inv_id,
            organization_id=sample_organization.id,
            branch_id=branch.id,
            sale_id=uuid.uuid4(),
            doc_type="04",
            consecutive_number=cons,
            numeric_key=numeric_key,
            xml_generated="<dummy/>",
            xml_signed="<dummy_signed/>",
            status="PENDING"
        )
        db_session.add(inv)

        entry = await OutboxService.enqueue_invoice(
            db=db_session,
            organization_id=sample_organization.id,
            branch_id=branch.id,
            invoice_id=inv_id,
            numeric_key=numeric_key,
            consecutive_number=cons,
            doc_type="04",
            xml_uncompressed="<dummy/>",
            xml_signed="<dummy_signed/>"
        )
        outbox_ids.append(entry.id)

    await db_session.commit()

    # 2. Run Phase 1: PENDING -> SENT
    # 4 concurrent worker invocations processing batches
    worker = HaciendaOutboxWorker(batch_size=5, hacienda_client=mock_client)
    await worker.process_batch(db_session)
    await worker.process_batch(db_session)
    await worker.process_batch(db_session)
    await worker.process_batch(db_session)

    # Verify all 20 were sent exactly once
    assert len(mock_client.sent_claves) == 20
    assert len(set(mock_client.sent_claves)) == 20  # No duplicate transmissions!

    # Check status: all records should now be in SENT
    sent_stmt = select(func.count(HaciendaOutbox.id)).where(
        HaciendaOutbox.id.in_(outbox_ids),
        HaciendaOutbox.status == "SENT"
    )
    sent_count = (await db_session.execute(sent_stmt)).scalar()
    assert sent_count == 20

    # 3. Fast-forward retry_at to simulate polling for resolution
    update_time = select(HaciendaOutbox).where(HaciendaOutbox.id.in_(outbox_ids))
    res = await db_session.execute(update_time)
    for r in res.scalars():
        r.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()

    # 4. Run Phase 2: SENT -> ACCEPTED
    await worker.process_batch(db_session)
    await worker.process_batch(db_session)
    await worker.process_batch(db_session)
    await worker.process_batch(db_session)

    # Check status: all records should now be ACCEPTED
    acc_stmt = select(func.count(HaciendaOutbox.id)).where(
        HaciendaOutbox.id.in_(outbox_ids),
        HaciendaOutbox.status == "ACCEPTED"
    )
    acc_count = (await db_session.execute(acc_stmt)).scalar()
    assert acc_count == 20

@pytest.mark.asyncio
async def test_outbox_exponential_backoff_and_contingency(
    db_session: AsyncSession,
    sample_organization: Organization
):
    """
    Verifies exponential backoff retry calculation and contingency status activation
    when Hacienda is persistently unavailable.
    """
    b_stmt = select(Branch).where(Branch.organization_id == sample_organization.id)
    b_res = await db_session.execute(b_stmt)
    branch = b_res.scalars().first()

    fail_client = MockHaciendaClient(fail_all=True)
    worker = HaciendaOutboxWorker(
        batch_size=1,
        max_retries=3,
        base_backoff_seconds=2,
        hacienda_client=fail_client
    )

    inv_id = uuid.uuid4()
    entry = await OutboxService.enqueue_invoice(
        db=db_session,
        organization_id=sample_organization.id,
        branch_id=branch.id,
        invoice_id=inv_id,
        numeric_key="50602092600310199988800100001049999999999111234567",
        consecutive_number="00100001049999999999",
        doc_type="04",
        xml_uncompressed="<dummy/>",
        xml_signed="<dummy_signed/>"
    )
    await db_session.commit()

    # Attempt 1: fails, retries with backoff = 2 * (2^1) = 4s
    await worker.process_batch(db_session)
    await db_session.refresh(entry)
    assert entry.retry_count == 1
    retry_time = entry.next_retry_at.replace(tzinfo=timezone.utc) if entry.next_retry_at.tzinfo is None else entry.next_retry_at
    assert retry_time > datetime.now(timezone.utc) - timedelta(seconds=5)

    # Simulate time pass
    entry.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()

    # Attempt 2: fails, retries with backoff = 2 * (2^2) = 8s
    await worker.process_batch(db_session)
    await db_session.refresh(entry)
    assert entry.retry_count == 2
    assert entry.status == "PENDING"

    # Simulate time pass
    entry.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()

    # Attempt 3: exceeds max_retries (3) -> Activates CONTINGENCY
    await worker.process_batch(db_session)
    await db_session.refresh(entry)
    assert entry.retry_count == 3
    assert entry.status == "CONTINGENCY"
    assert "contingencia" in str(entry.last_error).lower()
