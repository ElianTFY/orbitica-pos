"""Regression coverage for real persistence boundaries (no Hacienda acceptance claim)."""
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select, func

from app.core.config import settings
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.models.user import User
from app.models.branch import Branch
from app.models.organization import Organization
from app.services.fiscal_readiness import require_live_readiness
from app.core.exceptions import BadRequestException
from app.workers.hacienda_outbox_worker import HaciendaOutboxWorker


async def setup_checkout(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'owner@elsol.cr', 'password': 'OwnerPassword123!'})
    headers = {'Authorization': f"Bearer {response.json()['data']['access_token']}"}
    branch = (await client.get('/api/v1/branches', headers=headers)).json()['data'][0]['id']
    tax = (await client.get('/api/v1/tax-rates', headers=headers)).json()['data'][0]['id']
    product = await client.post('/api/v1/products', headers=headers, json={
        'name': 'Producto de prueba local', 'sale_price': 1130, 'cost_price': 700,
        'tax_rate_id': tax, 'cabys_code': '2132100000100', 'initial_stock': 4, 'branch_id': branch,
    })
    assert product.status_code == 201, product.text
    reg = await client.post('/api/v1/cash-registers', headers=headers, json={
        'branch_id': branch, 'name': 'Caja A', 'pos_terminal_number': '00001',
    })
    assert reg.status_code == 201, reg.text
    opened = await client.post('/api/v1/cash-registers/sessions/open', headers=headers,
                               json={'cash_register_id': reg.json()['data']['id'], 'initial_cash_amount': 1000})
    assert opened.status_code == 201, opened.text
    return headers, branch, product.json()['data']['id'], opened.json()['data']['id'], reg.json()['data']['id']


@pytest.mark.asyncio
async def test_cash_change_adjustments_refund_and_closure(client, db_session, sample_organization):
    headers, branch, product, session, register = await setup_checkout(client)
    payload = {'branch_id': branch, 'cash_session_id': session, 'items': [{'product_id': product, 'quantity': 1}],
               'payments': [{'payment_method': 'CASH', 'amount': 2000}, {'payment_method': 'CARD', 'amount': 130}]}
    sale = await client.post('/api/v1/sales', headers={**headers, 'Idempotency-Key': 'cash-sale'}, json=payload)
    assert sale.status_code == 201, sale.text
    data = sale.json()['data']
    assert data['invoice_id'] and data['fiscal_status'] == 'QUEUED'
    outbox = (await db_session.execute(select(HaciendaOutbox).where(HaciendaOutbox.invoice_id == data['invoice_id']))).scalar_one()
    assert outbox.status == 'PENDING_SIGNATURE'
    active = (await client.get('/api/v1/cash-registers/current', headers=headers)).json()['data']
    assert Decimal(active['cash_sales']) == 1000
    assert Decimal(active['card_sales']) == 130
    assert Decimal(active['expected_cash_amount']) == 2000
    for kind, amount in [('INFLOW', 500), ('OUTFLOW', 300)]:
        result = await client.post(f'/api/v1/cash-registers/sessions/{session}/movements', headers=headers,
                                   json={'movement_type': kind, 'amount': amount, 'reason': 'Ajuste de prueba local'})
        assert result.status_code == 201, result.text
    refund = await client.post(f"/api/v1/sales/{data['id']}/refund", headers=headers, json={'reason': 'Devolución de prueba'})
    assert refund.status_code == 200, refund.text
    active = (await client.get('/api/v1/cash-registers/current', headers=headers)).json()['data']
    assert Decimal(active['expected_cash_amount']) == 1200
    assert Decimal(active['cash_outflows']) == 1300
    closed = await client.post(f'/api/v1/cash-registers/sessions/{session}/close', headers=headers,
                               json={'actual_cash_amount': 1200})
    assert closed.status_code == 200, closed.text
    assert Decimal(closed.json()['data']['cash_difference']) == 0
    repeat = await client.post(f'/api/v1/cash-registers/sessions/{session}/close', headers=headers,
                               json={'actual_cash_amount': 1200})
    assert repeat.status_code == 409


@pytest.mark.asyncio
async def test_cash_refund_uses_current_drawer_after_original_closed(client, db_session, sample_organization):
    headers, branch, product, session, register = await setup_checkout(client)
    sale = await client.post('/api/v1/sales', headers=headers, json={
        'branch_id': branch, 'cash_session_id': session, 'items': [{'product_id': product, 'quantity': 1}],
        'payments': [{'payment_method': 'CASH_CRC', 'amount': 2000}],
    })
    assert sale.status_code == 201
    close = await client.post(f'/api/v1/cash-registers/sessions/{session}/close', headers=headers, json={'actual_cash_amount': 2130})
    assert close.status_code == 200
    url = f"/api/v1/sales/{sale.json()['data']['id']}/refund"
    assert (await client.post(url, headers=headers, json={'reason': 'Devolución'})).status_code == 409
    opened = await client.post('/api/v1/cash-registers/sessions/open', headers=headers,
                               json={'cash_register_id': register, 'initial_cash_amount': 2000})
    assert opened.status_code == 201
    assert (await client.post(url, headers=headers, json={'reason': 'Devolución'})).status_code == 200
    current = (await client.get('/api/v1/cash-registers/current', headers=headers)).json()['data']
    assert Decimal(current['expected_cash_amount']) == 870
    from app.models.cash_register import CashRegisterSession
    await db_session.refresh((await db_session.execute(select(CashRegisterSession).where(CashRegisterSession.id == session))).scalar_one())
    old = (await db_session.execute(select(CashRegisterSession).where(CashRegisterSession.id == session))).scalar_one()
    assert old.expected_cash_amount == Decimal('2130')


@pytest.mark.asyncio
async def test_staff_persists_and_cannot_modify_owner_or_foreign_branch(client, db_session, sample_organization):
    headers, branch, product, session, register = await setup_checkout(client)
    manager = await client.post('/api/v1/users', headers=headers, json={
        'full_name': 'Gerente de pruebas', 'email': 'manager@example.com', 'password': 'SecureLocal123!',
        'role': 'manager', 'branch_ids': [branch],
    })
    assert manager.status_code == 201, manager.text
    manager_data = manager.json()['data']
    assert manager_data['branch_ids'] == [branch]
    login = await client.post('/api/v1/auth/login', json={'email': manager_data['email'], 'password': 'SecureLocal123!'})
    mh = {'Authorization': f"Bearer {login.json()['data']['access_token']}"}
    owner = (await db_session.execute(select(User).where(User.organization_id == sample_organization.id, User.role == 'owner'))).scalar_one()
    assert (await client.put(f'/api/v1/users/{owner.id}', headers=mh, json={'is_active': False})).status_code == 403
    assert (await client.put(f'/api/v1/users/{owner.id}', headers=mh, json={'role': 'cashier'})).status_code == 403
    invalid = await client.put(f"/api/v1/users/{manager_data['id']}", headers=headers, json={'branch_ids': [str(uuid.uuid4())]})
    assert invalid.status_code == 400
    # A failed mutation must not remove existing branch access.
    await db_session.rollback()
    listed = (await client.get('/api/v1/users', headers=headers)).json()['data']
    assert next(u for u in listed if u['id'] == manager_data['id'])['branch_ids'] == [branch]


@pytest.mark.asyncio
async def test_cashier_cannot_sell_or_close_another_operators_shift(client, db_session, sample_organization):
    headers, branch, product, session, register = await setup_checkout(client)
    response = await client.post('/api/v1/users', headers=headers, json={
        'full_name': 'Cajero de pruebas', 'email': 'cashier@example.com', 'password': 'SecureLocal123!',
        'role': 'cashier', 'branch_ids': [branch],
    })
    assert response.status_code == 201
    login = await client.post('/api/v1/auth/login', json={'email': 'cashier@example.com', 'password': 'SecureLocal123!'})
    ch = {'Authorization': f"Bearer {login.json()['data']['access_token']}"}
    assert (await client.post(f'/api/v1/cash-registers/sessions/{session}/close', headers=ch, json={'actual_cash_amount': 1000})).status_code == 403
    sale = await client.post('/api/v1/sales', headers=ch, json={
        'branch_id': branch, 'cash_session_id': session, 'items': [{'product_id': product, 'quantity': 1}],
        'payments': [{'payment_method': 'CARD', 'amount': 1130}],
    })
    assert sale.status_code == 403
    discount = await client.post('/api/v1/sales', headers=ch, json={
        'branch_id': branch, 'items': [{'product_id': product, 'quantity': 1, 'discount_percentage': 50}],
        'payments': [{'payment_method': 'CARD', 'amount': 565}],
    })
    assert discount.status_code == 403


@pytest.mark.asyncio
async def test_branch_edits_persist_and_fiscal_code_cannot_change(client, sample_organization):
    headers, _, _, _, _ = await setup_checkout(client)
    response = await client.post('/api/v1/branches', headers=headers, json={'name': 'Segunda tienda', 'code': '002'})
    assert response.status_code == 201
    branch_id = response.json()['data']['id']
    updated = await client.put(f'/api/v1/branches/{branch_id}', headers=headers, json={'name': 'Tienda Norte', 'phone': '22222222'})
    assert updated.status_code == 200
    assert (await client.get(f'/api/v1/branches/{branch_id}', headers=headers)).json()['data']['name'] == 'Tienda Norte'
    assert (await client.put(f'/api/v1/branches/{branch_id}', headers=headers, json={'code': '003'})).status_code == 409
    assert (await client.delete(f'/api/v1/branches/{branch_id}', headers=headers)).status_code == 200
    assert (await client.get(f'/api/v1/branches/{branch_id}', headers=headers)).json()['data']['is_active'] is False


@pytest.mark.asyncio
async def test_production_readiness_is_scoped_to_company(db_session, sample_organization, monkeypatch):
    monkeypatch.setattr(settings, 'HACIENDA_LIVE_EMISSION_ENABLED', True)
    monkeypatch.setattr(settings, 'HACIENDA_SANDBOX_VALIDATED', True)
    branch = (await db_session.execute(select(Branch).where(Branch.organization_id == sample_organization.id))).scalar_one()
    for kind in ('01', '04', '03'):
        db_session.add(ElectronicInvoice(organization_id=sample_organization.id, branch_id=branch.id,
            numeric_key=kind + '1' * 48, consecutive_number='00100001' + kind + '0000000001', doc_type=kind,
            status='ACCEPTED', environment='STAGING', sent_to_hacienda_at=datetime.now(timezone.utc),
            hacienda_response_xml='<TestOnly/>'))
    await db_session.commit()
    await require_live_readiness(db_session, sample_organization.id, 'PRODUCTION')
    with pytest.raises(BadRequestException, match='Esta empresa'):
        await require_live_readiness(db_session, uuid.uuid4(), 'PRODUCTION')


@pytest.mark.asyncio
async def test_worker_reconciles_after_lost_post_response_and_rollback(db_session, sample_organization):
    from app.services.outbox_service import OutboxService
    class LostResponseClient:
        def __init__(self):
            self.sent_claves = []
        async def check_status(self, *, token, clave):
            if clave in self.sent_claves:
                return {"status_code": 200, "status": "aceptado", "response_xml": "<LocalTestResponse/>"}
            return {"status_code": 404, "status": "no_encontrado"}
        async def send_invoice(self, **kwargs):
            self.sent_claves.append(kwargs['clave'])
            raise ConnectionError('Connection lost after upstream receipt')
    branch = (await db_session.execute(select(Branch).where(Branch.organization_id == sample_organization.id))).scalar_one()
    invoice = ElectronicInvoice(organization_id=sample_organization.id, branch_id=branch.id,
        numeric_key='506' + '2' * 47, consecutive_number='00100001040000000001', doc_type='04',
        status='QUEUED', xml_signed='<LocalTest/>', xml_generated='<LocalTest/>')
    db_session.add(invoice)
    await db_session.flush()
    record = await OutboxService.enqueue_invoice(db_session, sample_organization.id, branch.id, invoice.id,
        invoice.numeric_key, invoice.consecutive_number, '04', '<LocalTest/>', '<LocalTest/>')
    record_id, invoice_id, key = record.id, invoice.id, invoice.numeric_key
    await db_session.commit()
    fake = LostResponseClient()
    worker = HaciendaOutboxWorker(hacienda_client=fake)
    with pytest.raises(ConnectionError):
        await worker._process_record(db_session, record)
    await db_session.rollback()  # Equivalent to process death before transaction commit.
    await worker.process_batch(db_session)
    recovered = (await db_session.execute(select(HaciendaOutbox).where(HaciendaOutbox.id == record_id))).scalar_one()
    assert recovered.status == 'SENT'
    assert fake.sent_claves == [key]
    recovered.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()
    await worker.process_batch(db_session)
    assert fake.sent_claves == [key]
    assert recovered.status == 'ACCEPTED'
