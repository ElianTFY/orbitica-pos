import uuid
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12, BestAvailableEncryption
from app.services.xades_signer_v44 import XAdESSignerV44, XMLDSIG_NS, XADES_NS, POLICY_IDENTIFIER
from app.services.xades_service import sign_xml_document, verify_xml_signature
from app.services.hacienda_xml_generator_v44 import HaciendaXMLGeneratorV44
from app.core.exceptions import BadRequestException
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.sale import Sale, SaleItem, SalePayment

def generate_custom_p12(
    pin: str = "1234",
    not_valid_before: datetime = None,
    not_valid_after: datetime = None
) -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CR"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "ORBITICA CR S.A."),
        x509.NameAttribute(NameOID.COMMON_NAME, "Firma Digital Tributaria")
    ])

    now = datetime.now(timezone.utc)
    nvb = not_valid_before or (now - timedelta(days=1))
    nva = not_valid_after or (now + timedelta(days=365))

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(nvb)
        .not_valid_after(nva)
        .sign(key, hashes.SHA256())
    )

    return pkcs12.serialize_key_and_certificates(
        name=b"test_fiscal_cert",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=BestAvailableEncryption(pin.encode("utf-8"))
    )

@pytest.fixture
def sample_xml():
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        legal_name="ORBITICA CR S.A.",
        identification_type="02",
        identification_number="3101999888",
        economic_activity_code="620101",
        email="info@orbitica.cr",
        phone="50622221111",
        province_code="1",
        canton_code="01",
        district_code="01",
        address_detail="San Jose Central"
    )
    branch = Branch(
        id=uuid.uuid4(),
        organization_id=org_id,
        name="Central",
        code="001",
        phone="22221111",
        address="San Jose Central"
    )
    item = SaleItem(
        id=uuid.uuid4(),
        product_name="Servicio de Facturacion",
        product_sku="SRV-01",
        quantity=Decimal("1.00"),
        unit_price=Decimal("1000.0000"),
        unit_cost=Decimal("500.0000"),
        discount_percentage=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        tax_rate=Decimal("13.00"),
        tax_amount=Decimal("130.00"),
        line_total=Decimal("1130.00")
    )
    item.cabys_code = "6339900000000"
    item.unit_of_measure = "Unid"
    sale = Sale(
        id=uuid.uuid4(),
        organization_id=org_id,
        branch_id=branch.id,
        user_id=uuid.uuid4(),
        sale_number="TIQ-001-00001",
        status="COMPLETED",
        currency="CRC",
        subtotal_amount=Decimal("1000.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("130.00"),
        total_amount=Decimal("1130.00")
    )
    sale.items = [item]
    sale.payments = [SalePayment(id=uuid.uuid4(), payment_method="CASH", amount=Decimal("1130.00"))]

    return HaciendaXMLGeneratorV44.generate_xml(
        doc_type="04",
        numeric_key="50602092600310199988800100001040000000000111234567",
        consecutive_number="00100001040000000001",
        sale=sale,
        org=org,
        branch=branch,
        validate_xsd=False
    )

def test_xades_epes_signing_and_verification(sample_xml):
    pin = "5678"
    p12_bytes = generate_custom_p12(pin=pin)

    signed_xml = sign_xml_document(sample_xml, p12_bytes, pin)

    assert "<ds:Signature" in signed_xml
    assert f'xmlns:ds="{XMLDSIG_NS}"' in signed_xml
    assert f'xmlns:xades="{XADES_NS}"' in signed_xml
    assert POLICY_IDENTIFIER in signed_xml

    # Check ds:Signature is inserted right at the end of the root document
    assert signed_xml.strip().endswith("</TiqueteElectronico>")
    root_before_close = signed_xml.rfind("</ds:Signature>")
    assert root_before_close != -1
    assert signed_xml[root_before_close:].find("</TiqueteElectronico>") != -1

    # Cryptographic verification
    assert verify_xml_signature(signed_xml) is True

    # Validate against official XSD with the real XAdES-EPES signature
    HaciendaXMLGeneratorV44.validate_xml_schema(signed_xml, "04")

def test_expired_certificate_is_blocked(sample_xml):
    pin = "1234"
    # Create certificate expired yesterday
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    two_days_ago = yesterday - timedelta(days=1)
    p12_expired = generate_custom_p12(pin=pin, not_valid_before=two_days_ago, not_valid_after=yesterday)

    with pytest.raises(BadRequestException) as exc_info:
        sign_xml_document(sample_xml, p12_expired, pin)
    assert "expirado" in str(exc_info.value).lower()

def test_future_certificate_is_blocked(sample_xml):
    pin = "1234"
    # Certificate starting tomorrow
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    next_year = tomorrow + timedelta(days=365)
    p12_future = generate_custom_p12(pin=pin, not_valid_before=tomorrow, not_valid_after=next_year)

    with pytest.raises(BadRequestException) as exc_info:
        sign_xml_document(sample_xml, p12_future, pin)
    assert "vigencia" in str(exc_info.value).lower()

def test_tampered_document_fails_verification(sample_xml):
    pin = "4321"
    p12_bytes = generate_custom_p12(pin=pin)
    signed_xml = sign_xml_document(sample_xml, p12_bytes, pin)

    # Tamper document total
    tampered_xml = signed_xml.replace("<TotalComprobante>1130.00</TotalComprobante>", "<TotalComprobante>9999.00</TotalComprobante>")
    assert verify_xml_signature(tampered_xml) is False
