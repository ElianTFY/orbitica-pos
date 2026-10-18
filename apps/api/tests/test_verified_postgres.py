"""PostgreSQL-only tests: separate transactions and real row locks."""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.branch import Branch
from app.models.user import User
from app.models.catalog import Product, TaxRate, BranchProductStock
from app.models.sale import Sale
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.models.cash_register import CashRegister, CashRegisterSession
from app.schemas.sale import SaleCreate
from app.schemas.cash_register import SessionOpenRequest
from app.services.sale_service import SaleService
from app.services.cash_register_service import CashRegisterService
from app.services.outbox_service import OutboxService
from app.workers.hacienda_outbox_worker import HaciendaOutboxWorker
from app.core.exceptions import BadRequestException, ConflictException

pytestmark = [pytest.mark.asyncio, pytest.mark.postgres_integration]


async def parties(db, org_id):
    branch = (await db.execute(select(Branch).where(Branch.organization_id == org_id))).scalars().first()
    owner = (await db.execute(select(User).where(User.organization_id == org_id, User.role == 'owner'))).scalar_one()
    tax = (await db.execute(select(TaxRate).where(TaxRate.organization_id == org_id, TaxRate.rate == 13))).scalar_one()
    return branch, owner, tax


async def test_last_unit_two_independent_checkouts(db_session, sample_organization):
    org_id = sample_organization.id
    branch, owner, tax = await parties(db_session, org_id)
    product = Product(organization_id=org_id, name='Last unit', sale_price=Decimal('1130'),
                      cost_price=Decimal('700'), tax_rate_id=tax.id, cabys_code='2132100000100', is_service=False)
    db_session.add(product)
    await db_session.flush()
    db_session.add(BranchProductStock(branch_id=branch.id, product_id=product.id, quantity=1))
    await db_session.commit()
    payload = SaleCreate(branch_id=branch.id, items=[{'product_id': product.id, 'quantity': 1}],
                         payments=[{'payment_method': 'CARD', 'amount': 1130}])
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    async def checkout():
        async with factory() as session:
            try:
                return (await SaleService(session, org_id).create_sale(payload, owner.id)).id
            except BadRequestException as error:
                await session.rollback()
                assert 'Stock insuficiente' in str(error)
                return None
    results = await asyncio.wait_for(asyncio.gather(checkout(), checkout()), timeout=20)
    assert len([value for value in results if value]) == 1
    assert (await db_session.execute(select(BranchProductStock.quantity).where(BranchProductStock.product_id == product.id))).scalar_one() == 0
    assert (await db_session.execute(select(func.count()).select_from(HaciendaOutbox).where(HaciendaOutbox.organization_id == org_id))).scalar_one() == 1


async def test_two_open_requests_create_one_shift(db_session, sample_organization):
    org_id = sample_organization.id
    branch, owner, _ = await parties(db_session, org_id)
    register = CashRegister(organization_id=org_id, branch_id=branch.id, name='PG register', pos_terminal_number='00001')
    db_session.add(register)
    await db_session.commit()
    payload = SessionOpenRequest(cash_register_id=register.id, initial_cash_amount=1000)
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    async def open_shift():
        async with factory() as session:
            try:
                return (await CashRegisterService(session, org_id).open_session(payload, owner.id)).id
            except ConflictException:
                await session.rollback()
                return None
    results = await asyncio.wait_for(asyncio.gather(open_shift(), open_shift()), timeout=20)
    assert len([value for value in results if value]) == 1
    assert (await db_session.execute(select(func.count()).select_from(CashRegisterSession).where(
        CashRegisterSession.organization_id == org_id, CashRegisterSession.status == 'OPEN'))).scalar_one() == 1


async def test_four_workers_claim_twenty_documents_without_duplicate_posts(db_session, sample_organization):
    org_id = sample_organization.id
    branch, _, _ = await parties(db_session, org_id)
    # Defer unrelated fixtures in this disposable CI database so workers
    # compete for precisely the 20 events owned by this test.
    await db_session.execute(update(HaciendaOutbox).where(HaciendaOutbox.organization_id != org_id).values(
        next_retry_at=datetime.now(timezone.utc) + timedelta(hours=1)))
    ids = []
    for i in range(20):
        number = f'{uuid.uuid4().int % (10**50):050d}'
        invoice = ElectronicInvoice(organization_id=org_id, branch_id=branch.id, doc_type='04',
            consecutive_number=f'0010000104{i:010d}', numeric_key=number, xml_generated='<Test/>', xml_signed='<Test/>', status='QUEUED')
        db_session.add(invoice)
        await db_session.flush()
        entry = await OutboxService.enqueue_invoice(db_session, org_id, branch.id, invoice.id, number,
            invoice.consecutive_number, '04', '<Test/>', '<Test/>')
        ids.append(entry.id)
    await db_session.commit()
    class Upstream:
        def __init__(self):
            self.sent = []
        async def check_status(self, *, token, clave):
            await asyncio.sleep(0.005)
            if clave in self.sent:
                return {'status_code': 200, 'status': 'aceptado', 'response_xml': '<SimulatedTestOnly/>'}
            return {'status_code': 404, 'status': 'no_encontrado'}
        async def send_invoice(self, **kwargs):
            await asyncio.sleep(0.01)
            self.sent.append(kwargs['clave'])
            return {'status_code': 201, 'success': True}
    upstream = Upstream()
    factory = async_sessionmaker(db_session.bind, expire_on_commit=False)
    async def run_worker():
        async with factory() as session:
            return await HaciendaOutboxWorker(batch_size=5, hacienda_client=upstream).process_batch(session)
    await asyncio.wait_for(asyncio.gather(*(run_worker() for _ in range(4))), timeout=30)
    assert len(upstream.sent) == len(set(upstream.sent)) == 20
    await db_session.execute(update(HaciendaOutbox).where(HaciendaOutbox.id.in_(ids)).values(next_retry_at=datetime.now(timezone.utc) - timedelta(seconds=1)))
    await db_session.commit()
    await asyncio.wait_for(asyncio.gather(*(run_worker() for _ in range(4))), timeout=30)
    assert len(upstream.sent) == 20
    assert (await db_session.execute(select(func.count()).select_from(HaciendaOutbox).where(
        HaciendaOutbox.id.in_(ids), HaciendaOutbox.status == 'ACCEPTED'))).scalar_one() == 20
