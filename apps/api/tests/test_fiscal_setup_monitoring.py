"""Regression coverage for real setup blockers; HTTP responses below are simulated."""
import base64
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.constants import UserRole
from app.core.exceptions import BadRequestException
from app.models.fiscal_credential import FiscalCredential
from app.models.fiscal_worker import FiscalWorkerHeartbeat
from app.models.invoice import ElectronicInvoice
from app.models.branch import Branch
from app.models.organization import Organization
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.fiscal_readiness import fiscal_readiness_report
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.hacienda_client import HaciendaAPIClient
from app.infrastructure.external.hacienda_api_client import HaciendaAPIClient as StatusClient
from app.workers.hacienda_outbox_worker import HaciendaOutboxWorker
from tests.session_helpers import token_for
from tests.test_xades_and_hacienda_live import generate_test_p12


async def owner_headers(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'owner@elsol.cr', 'password': 'OwnerPassword123!'})
    return {'Authorization': f"Bearer {response.json()['data']['access_token']}"}


def credential_payload(environment='STAGING'):
    return {'environment': environment, 'atv_username': f'api-test-{environment}@example.test',
            'atv_password': 'test-only-password-not-sent', 'pin': '1234',
            'p12_base64': base64.b64encode(generate_test_p12()).decode()}


@pytest.mark.asyncio
async def test_empty_provider_and_missing_worker_are_not_ready(client, sample_organization, monkeypatch):
    monkeypatch.setattr(settings, 'SOFTWARE_PROVIDER_TAX_ID', '')
    response = await client.get('/api/v1/hacienda/readiness', headers=await owner_headers(client))
    assert response.status_code == 200, response.text
    data = response.json()['data']
    checks = {check['code']: check['ok'] for check in data['checks']}
    assert data['ready'] is False
    assert checks['PROVIDER_ID'] is False and checks['WORKER'] is False
    assert checks['EMITTER_PROFILE'] is True
    assert data['queue'] == {'pending': 0, 'attention': 0, 'email_pending': 0}


@pytest.mark.asyncio
async def test_credentials_require_certificate_for_each_environment(client, db_session, sample_organization):
    headers = await owner_headers(client)
    payload = credential_payload()
    no_certificate = {k: v for k, v in payload.items() if k != 'p12_base64'}
    assert (await client.post('/api/v1/hacienda/credentials', headers=headers, json=no_certificate)).status_code == 400
    assert (await client.post('/api/v1/hacienda/credentials', headers=headers, json=payload)).status_code == 200
    staging = (await client.get('/api/v1/hacienda/credentials?environment=STAGING', headers=headers)).json()['data']
    production = (await client.get('/api/v1/hacienda/credentials?environment=PRODUCTION', headers=headers)).json()['data']
    assert staging['has_certificate'] and staging['certificate_expires_at']
    assert production['has_certificate'] is False and production['atv_username'] == ''
    no_certificate['environment'] = 'PRODUCTION'
    assert (await client.post('/api/v1/hacienda/credentials', headers=headers, json=no_certificate)).status_code == 400
    invalid_env = await client.get('/api/v1/hacienda/readiness?environment=OTHER', headers=headers)
    assert invalid_env.status_code == 422


@pytest.mark.asyncio
async def test_saved_connection_is_scoped_persisted_and_invalidated_on_save(client, db_session, sample_organization, monkeypatch):
    headers = await owner_headers(client)
    payload = credential_payload()
    assert (await client.post('/api/v1/hacienda/credentials', headers=headers, json=payload)).status_code == 200
    calls = []

    async def token(self, username, password):
        calls.append((self.env, username, password))
        return {'access_token': 'SENSITIVE_TEST_TOKEN', 'token_type': 'bearer', 'expires_in': 217}

    monkeypatch.setattr(HaciendaAPIClient, 'get_access_token', token)
    # Previewing unsaved values does not certify the stored credentials.
    preview = await client.post('/api/v1/hacienda/test-connection', headers=headers, json={
        'environment': 'STAGING', 'atv_username': 'unsaved@example.test', 'atv_password': 'unsaved-password'})
    assert preview.json()['success'] is True
    cred = (await db_session.execute(select(FiscalCredential))).scalar_one()
    assert cred.connection_tested_at is None
    response = await client.post('/api/v1/hacienda/test-connection', headers=headers, json={'environment': 'STAGING'})
    assert response.status_code == 200 and response.json()['data']['expires_in'] == 217
    assert 'SENSITIVE_TEST_TOKEN' not in response.text and payload['atv_password'] not in response.text
    assert calls[-1] == ('STAGING', payload['atv_username'], payload['atv_password'])
    await db_session.refresh(cred)
    assert cred.connection_test_success is True and cred.connection_tested_at
    # The other environment does not inherit stored credentials.
    assert (await client.post('/api/v1/hacienda/test-connection', headers=headers, json={'environment': 'PRODUCTION'})).status_code == 400
    update = await client.post('/api/v1/hacienda/credentials', headers=headers, json={
        'environment': 'STAGING', 'atv_username': payload['atv_username']})
    assert update.status_code == 200, update.text
    await db_session.refresh(cred)
    assert cred.connection_test_success is None and cred.connection_tested_at is None
    decrypted = await FiscalSecurityService.get_decrypted_credentials(db_session, sample_organization.id, 'STAGING')
    assert decrypted['pin'] == '1234' and decrypted['password'] == payload['atv_password']


@pytest.mark.asyncio
async def test_failed_authentication_never_returns_provider_secrets(client, db_session, sample_organization, monkeypatch):
    headers = await owner_headers(client)
    assert (await client.post('/api/v1/hacienda/credentials', headers=headers, json=credential_payload())).status_code == 200

    async def fail(*args, **kwargs):
        raise ValueError('IdP body containing SENSITIVE_PASSWORD_AND_TOKEN')

    monkeypatch.setattr(HaciendaAPIClient, 'get_access_token', fail)
    response = await client.post('/api/v1/hacienda/test-connection', headers=headers, json={'environment': 'STAGING'})
    assert response.json()['success'] is False
    assert 'SENSITIVE' not in response.text
    cred = (await db_session.execute(select(FiscalCredential))).scalar_one()
    assert cred.connection_test_success is False


@pytest.mark.asyncio
async def test_fiscal_credentials_are_not_exposed_to_cashiers(client, db_session, sample_organization):
    cashier = User(organization_id=sample_organization.id, email='cashier-fiscal@example.test',
                   full_name='Test Cashier', role=UserRole.CASHIER, password_hash='unused')
    db_session.add(cashier)
    await db_session.commit()
    headers = {'Authorization': f'Bearer {await token_for(db_session, cashier)}'}
    assert (await client.get('/api/v1/hacienda/credentials', headers=headers)).status_code == 403
    assert (await client.post('/api/v1/hacienda/test-connection', headers=headers, json={'environment': 'STAGING'})).status_code == 403


@pytest.mark.asyncio
async def test_credential_save_and_audit_rollback_together(client, db_session, sample_organization, monkeypatch):
    headers = await owner_headers(client)

    async def fail_audit(*args, **kwargs):
        raise BadRequestException('Injected audit failure')

    monkeypatch.setattr(AuditService, 'log_action', fail_audit)
    response = await client.post('/api/v1/hacienda/credentials', headers=headers, json=credential_payload())
    assert response.status_code == 400
    await db_session.rollback()
    assert (await db_session.execute(select(FiscalCredential))).scalars().all() == []


@pytest.mark.asyncio
async def test_worker_monitor_does_not_accept_stale_or_stopped_process(db_session, sample_organization):
    worker = HaciendaOutboxWorker()
    await worker.write_heartbeat(db_session, 'RUNNING')
    report = await fiscal_readiness_report(db_session, sample_organization, 'STAGING')
    assert report['worker']['active'] is True
    heartbeat = await db_session.get(FiscalWorkerHeartbeat, worker.worker_id)
    heartbeat.last_seen_at = datetime.now(timezone.utc) - timedelta(seconds=90)
    await db_session.commit()
    assert (await fiscal_readiness_report(db_session, sample_organization, 'STAGING'))['worker']['active'] is False
    await worker.write_heartbeat(db_session, 'STOPPED')
    assert (await fiscal_readiness_report(db_session, sample_organization, 'STAGING'))['worker']['active'] is False


@pytest.mark.asyncio
async def test_production_check_uses_company_document_evidence(db_session, sample_organization, monkeypatch):
    monkeypatch.setattr(settings, 'HACIENDA_SANDBOX_VALIDATED', True)
    monkeypatch.setattr(settings, 'HACIENDA_LIVE_EMISSION_ENABLED', True)
    org_id = sample_organization.id
    branch_id = (await db_session.execute(select(Branch.id).where(Branch.organization_id == org_id))).scalars().first()
    for index, code in enumerate(['01', '04', '03']):
        db_session.add(ElectronicInvoice(organization_id=org_id, branch_id=branch_id, doc_type=code,
            numeric_key=f'{index:050d}', consecutive_number=f'{index:020d}', environment='STAGING',
            status='ACCEPTED', sent_to_hacienda_at=datetime.now(timezone.utc), hacienda_response_xml='<test-only/>'))
    await db_session.commit()
    report = await fiscal_readiness_report(db_session, sample_organization, 'PRODUCTION')
    assert next(check['ok'] for check in report['checks'] if check['code'] == 'SANDBOX_DOCUMENTS') is True
    other = Organization(legal_name='Other synthetic company', trade_name='Other', identification_type='02',
                         identification_number='3101999777', email='other@example.test')
    db_session.add(other)
    await db_session.commit()
    other_report = await fiscal_readiness_report(db_session, other, 'PRODUCTION')
    assert not any(document['accepted'] for document in other_report['sandbox_documents'])
    assert next(check['ok'] for check in other_report['checks'] if check['code'] == 'SANDBOX_DOCUMENTS') is False


@pytest.mark.asyncio
@pytest.mark.parametrize('bad_response', ['different_key', 'missing_xml', 'invalid_base64', 'unknown_status'])
async def test_manual_poll_and_worker_share_strict_response_checks(monkeypatch, bad_response):
    key = '5' * 50
    data = {'clave': key, 'ind-estado': 'aceptado', 'respuesta-xml': base64.b64encode(b'<test-response/>').decode()}
    if bad_response == 'different_key':
        data['clave'] = '6' * 50
    elif bad_response == 'missing_xml':
        del data['respuesta-xml']
    elif bad_response == 'invalid_base64':
        data['respuesta-xml'] = 'not base64!'
    else:
        data['ind-estado'] = 'invented'
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=data))
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original_client(transport=transport, **kwargs))
    with pytest.raises(ValueError):
        await StatusClient().query_document_status('synthetic-token', key, 'STAGING')


@pytest.mark.asyncio
async def test_sandbox_email_is_labeled_and_business_text_cannot_inject_markup():
    from app.services.email_service import FiscalEmailService
    from app.adapters.email_adapter import ConsoleEmailAdapter
    adapter = ConsoleEmailAdapter()
    service = FiscalEmailService(adapter)
    sent = await service.send_invoice_email(
        to_email='synthetic@example.test', issuer_name='<script>test</script>',
        customer_name='<img src=x>', consecutive_number='1' * 20, numeric_key='5' * 50,
        total_amount=Decimal('1130'), currency='CRC', signed_xml='<synthetic-signed/>',
        hacienda_response_xml='<synthetic-response/>', environment='STAGING')
    assert sent is True
    mail = adapter.sent_emails[0]
    assert mail['subject'].startswith('[PRUEBAS]')
    assert 'sin validez tributaria' in mail['html']
    assert '<script>' not in mail['html'] and '<img src=x>' not in mail['html']
    assert '&lt;script&gt;' in mail['html']
    assert len(mail['attachments']) == 2


@pytest.mark.asyncio
async def test_hacienda_error_is_visible_and_recovery_only_polls_original_key(db_session, sample_organization):
    from app.models.outbox import HaciendaOutbox
    from app.services.invoice_service import InvoiceService
    branch_id = (await db_session.execute(select(Branch.id).where(
        Branch.organization_id == sample_organization.id))).scalars().first()
    invoice = ElectronicInvoice(organization_id=sample_organization.id, branch_id=branch_id,
        doc_type='04', numeric_key='7' * 50, consecutive_number='1' * 20,
        environment='STAGING', status='PROCESSING', xml_signed='<synthetic-signed/>',
        sent_to_hacienda_at=datetime.now(timezone.utc))
    db_session.add(invoice)
    await db_session.flush()
    outbox = HaciendaOutbox(organization_id=sample_organization.id, branch_id=branch_id,
        invoice_id=invoice.id, numeric_key=invoice.numeric_key, consecutive_number=invoice.consecutive_number,
        doc_type='04', status='SENT', xml_uncompressed='<synthetic/>', xml_signed=invoice.xml_signed)
    db_session.add(outbox)
    await db_session.commit()

    class SimulatedHacienda:
        status = 'error'
        async def check_status(self, token, clave):
            assert clave == invoice.numeric_key
            return {'status_code': 200, 'status': self.status,
                    'response_xml': '<synthetic-response/>' if self.status == 'aceptado' else None}
        async def send_invoice(self, **kwargs):
            pytest.fail('An already received document must never be retransmitted')

    transport = SimulatedHacienda()
    worker = HaciendaOutboxWorker(hacienda_client=transport)
    await worker.process_batch(db_session)
    assert invoice.status == 'ERROR' and outbox.status == 'CONTINGENCY'
    assert invoice.hacienda_status_code == 'error'
    assert invoice.sent_to_hacienda_at and invoice.hacienda_error_message
    report = await fiscal_readiness_report(db_session, sample_organization, 'STAGING')
    assert report['queue']['attention'] == 1
    await InvoiceService(db_session, sample_organization.id).queue_invoice_for_transmission(invoice.id)
    transport.status = 'aceptado'
    await worker.process_batch(db_session)
    assert invoice.status == 'ACCEPTED' and outbox.status == 'ACCEPTED'
    assert invoice.hacienda_error_message is None and outbox.last_error is None
