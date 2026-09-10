from datetime import datetime, timezone, timedelta
from decimal import Decimal

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, pkcs12
from cryptography.x509.oid import NameOID
from httpx import AsyncClient
from lxml import etree
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.models.organization import Organization
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.hacienda_xml_generator_v44 import DOC_NAMESPACES, HaciendaXMLGeneratorV44
from app.services.invoice_service import InvoiceService


def _test_p12(pin: str) -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CR"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "EMISOR DE PRUEBAS S.A."),
        x509.NameAttribute(NameOID.COMMON_NAME, "Llave criptográfica de pruebas"),
    ])
    now = datetime.now(timezone.utc)
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=30))
        .sign(key, hashes.SHA256())
    )
    return pkcs12.serialize_key_and_certificates(
        name=b"test-fiscal-key",
        key=key,
        cert=certificate,
        cas=None,
        encryption_algorithm=BestAvailableEncryption(pin.encode()),
    )


@pytest.mark.asyncio
async def test_sale_sign_queue_and_accepted_refund_credit_note(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "SOFTWARE_PROVIDER_TAX_ID", "3101999888")
    sample_organization.economic_activity_code = "620101"
    sample_organization.province_code = "1"
    sample_organization.canton_code = "01"
    sample_organization.district_code = "01"
    sample_organization.address_detail = "San José, Costa Rica"
    sample_organization.atv_environment = "STAGING"
    await db_session.commit()

    pin = "1234"
    await FiscalSecurityService.save_fiscal_credentials(
        db=db_session,
        organization_id=sample_organization.id,
        environment="STAGING",
        p12_bytes=_test_p12(pin),
        pin=pin,
        atv_username="cpf-02-3101-999888@stag.comprobanteselectronicos.go.cr",
        atv_password="test-only-password",
    )

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"},
    )
    headers = {"Authorization": f"Bearer {login.json()['data']['access_token']}"}
    branch_id = (await client.get("/api/v1/branches", headers=headers)).json()["data"][0]["id"]
    tax_id = (await client.get("/api/v1/tax-rates", headers=headers)).json()["data"][0]["id"]
    product = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Jugo de tomate concentrado",
            "tax_rate_id": tax_id,
            "cabys_code": "2132100000100",
            "unit_of_measure": "Unid",
            "sale_price": 1130,
            "cost_price": 700,
            "is_service": True,
        },
    )
    assert product.status_code == 201

    sale_response = await client.post(
        "/api/v1/sales",
        headers={**headers, "Idempotency-Key": "fiscal-flow-sale-001"},
        json={
            "branch_id": branch_id,
            "items": [{"product_id": product.json()["data"]["id"], "quantity": 1}],
            "payments": [{"payment_method": "SINPE", "amount": 1130, "reference_number": "TEST-001"}],
        },
    )
    assert sale_response.status_code == 201
    sale_id = sale_response.json()["data"]["id"]

    original = (await db_session.execute(
        select(ElectronicInvoice).where(ElectronicInvoice.sale_id == sale_id)
    )).scalar_one()
    queued = await InvoiceService(db_session, sample_organization.id).queue_invoice_for_transmission(original.id)
    assert queued.status == "QUEUED"
    assert queued.xml_signed and "<ds:Signature" in queued.xml_signed
    HaciendaXMLGeneratorV44.validate_xml_schema(queued.xml_signed, "04")

    root = etree.fromstring(queued.xml_generated.encode())
    namespace = {"te": DOC_NAMESPACES["04"]}
    emitted_at = root.xpath("string(/te:TiqueteElectronico/te:FechaEmision)", namespaces=namespace)
    assert emitted_at.endswith("-06:00")

    original_outbox = (await db_session.execute(
        select(HaciendaOutbox).where(HaciendaOutbox.invoice_id == queued.id)
    )).scalar_one()
    original_outbox.status = "ACCEPTED"
    queued.status = "ACCEPTED"
    queued.sent_to_hacienda_at = datetime.now(timezone.utc)
    queued.hacienda_processed_at = datetime.now(timezone.utc)
    await db_session.commit()

    refund = await client.post(
        f"/api/v1/sales/{sale_id}/refund",
        headers={**headers, "Idempotency-Key": "fiscal-flow-refund-001"},
        json={"reason": "Devolución total de prueba"},
    )
    assert refund.status_code == 200
    assert refund.json()["data"]["status"] == "REFUNDED"

    credit_note = (await db_session.execute(
        select(ElectronicInvoice).where(
            ElectronicInvoice.sale_id == sale_id,
            ElectronicInvoice.doc_type == "03",
        )
    )).scalar_one()
    assert credit_note.status == "QUEUED"
    assert credit_note.reference_numeric_key == queued.numeric_key
    assert credit_note.xml_signed and "<ds:Signature" in credit_note.xml_signed
    HaciendaXMLGeneratorV44.validate_xml_schema(credit_note.xml_signed, "03")
    assert (await db_session.execute(
        select(HaciendaOutbox).where(HaciendaOutbox.invoice_id == credit_note.id)
    )).scalar_one().status == "PENDING"


@pytest.mark.asyncio
async def test_sale_and_idempotency_roll_back_together_and_cash_change_once(client, db_session, sample_organization, monkeypatch):
    from app.core.exceptions import BadRequestException
    from app.models.sale import Sale
    from app.models.idempotency import IdempotencyRecord
    from app.models.catalog import BranchProductStock
    from app.services.idempotency_service import IdempotencyService
    from sqlalchemy import func

    login = await client.post('/api/v1/auth/login', json={'email': 'owner@elsol.cr', 'password': 'OwnerPassword123!'})
    headers = {'Authorization': f"Bearer {login.json()['data']['access_token']}", 'Idempotency-Key': 'atomic-checkout'}
    branch_id = (await client.get('/api/v1/branches', headers=headers)).json()['data'][0]['id']
    tax_id = (await client.get('/api/v1/tax-rates', headers=headers)).json()['data'][0]['id']
    product = await client.post('/api/v1/products', headers=headers, json={
        'name': 'Producto de prueba transaccional', 'tax_rate_id': tax_id,
        'cabys_code': '2132100000100', 'sale_price': 1130, 'cost_price': 700,
        'initial_stock': 5, 'branch_id': branch_id,
    })
    assert product.status_code == 201, product.text
    product_id = product.json()['data']['id']
    payload = {
        'branch_id': branch_id,
        'items': [{'product_id': product_id, 'quantity': 1, 'discount_percentage': 10}],
        'payments': [
            {'payment_method': 'CASH_CRC', 'amount': 600},
            {'payment_method': 'CASH_CRC', 'amount': 600},
            {'payment_method': 'CARD', 'amount': 200},
        ],
    }
    complete = IdempotencyService.complete_idempotent_operation

    async def interrupted_commit(*args, **kwargs):
        raise BadRequestException('Injected failure after sale flush and before response commit')

    monkeypatch.setattr(IdempotencyService, 'complete_idempotent_operation', interrupted_commit)
    assert (await client.post('/api/v1/sales', headers=headers, json=payload)).status_code == 400
    await db_session.rollback()
    assert (await db_session.execute(select(func.count()).select_from(Sale))).scalar_one() == 0
    assert (await db_session.execute(select(func.count()).select_from(IdempotencyRecord))).scalar_one() == 0
    assert (await db_session.execute(select(BranchProductStock.quantity).where(BranchProductStock.product_id == product_id))).scalar_one() == 5

    monkeypatch.setattr(IdempotencyService, 'complete_idempotent_operation', complete)
    response = await client.post('/api/v1/sales', headers=headers, json=payload)
    assert response.status_code == 201, response.text
    sale = response.json()['data']
    assert Decimal(str(sale['total_amount'])) == Decimal('1017')
    assert sum(Decimal(str(p['change_returned'])) for p in sale['payments']) == Decimal('383')
    assert sum(Decimal(str(p['amount'])) - Decimal(str(p['change_returned'])) for p in sale['payments']) == Decimal('1017')
    retry = await client.post('/api/v1/sales', headers=headers, json=payload)
    assert retry.headers['X-Cache-Lookup'] == 'HIT'
    assert retry.json()['data']['id'] == sale['id']
    assert (await db_session.execute(select(func.count()).select_from(Sale))).scalar_one() == 1
