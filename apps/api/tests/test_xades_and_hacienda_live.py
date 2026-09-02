import base64
import uuid
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12, BestAvailableEncryption
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.organization import Organization
from app.models.sale import Sale, SaleItem
from app.models.branch import Branch
from app.services.xades_signer_v44 import XAdESSignerV44
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.hacienda_xml_generator_v44 import HaciendaXMLGeneratorV44
from app.core.exceptions import BadRequestException

def generate_test_p12(pin: str = "1234") -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CR"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Minimarket El Sol S.A."),
        x509.NameAttribute(NameOID.COMMON_NAME, "ATV Test Key v4.4")
    ])
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=365))
        .sign(key, hashes.SHA256())
    )

    return pkcs12.serialize_key_and_certificates(
        name=b"atv_test_key",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=BestAvailableEncryption(pin.encode("utf-8"))
    )

@pytest.mark.asyncio
async def test_p12_metadata_and_encryption_custody(db_session: AsyncSession, sample_organization: Organization):
    pin = "4321"
    p12_bytes = generate_test_p12(pin=pin)
    
    # 1. Save encrypted credentials
    cred = await FiscalSecurityService.save_fiscal_credentials(
        db=db_session,
        organization_id=sample_organization.id,
        environment="STAGING",
        p12_bytes=p12_bytes,
        pin=pin,
        atv_username="cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr",
        atv_password="SecretPassword123!"
    )
    assert cred.encrypted_p12 is not None
    assert cred.encrypted_pin != pin  # Must be encrypted!
    assert cred.encrypted_atv_password != "SecretPassword123!"  # Must be encrypted!
    assert cred.certificate_expiration is not None

    # 2. Decrypt in memory
    decrypted = await FiscalSecurityService.get_decrypted_credentials(
        db=db_session,
        organization_id=sample_organization.id,
        environment="STAGING"
    )
    assert decrypted["pin"] == pin
    assert decrypted["username"] == "cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr"
    assert decrypted["password"] == "SecretPassword123!"
    assert decrypted["p12_bytes"] == p12_bytes

@pytest.mark.asyncio
async def test_xml_generation_with_xsd_validation_and_cabys_enforcement(
    db_session: AsyncSession,
    sample_organization: Organization
):
    b_stmt = select(Branch).where(Branch.organization_id == sample_organization.id)
    b_res = await db_session.execute(b_stmt)
    branch = b_res.scalars().first()

    dummy_sale_id = uuid.uuid4()
    dummy_prod_id = uuid.uuid4()

    # Create dummy sale structure with real CAByS
    sale = Sale(
        organization_id=sample_organization.id,
        branch_id=branch.id,
        user_id=uuid.uuid4(),
        sale_number="FAC-001-00001",
        status="COMPLETED",
        currency="CRC",
        subtotal_amount=Decimal("1000.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("130.00"),
        total_amount=Decimal("1130.00")
    )

    item = SaleItem(
        sale_id=dummy_sale_id,
        product_id=dummy_prod_id,
        product_name="Arroz Grano Entero 1kg",
        product_sku="ARR-001",
        quantity=Decimal("1.00"),
        unit_price=Decimal("1130.0000"),
        unit_cost=Decimal("800.0000"),
        discount_percentage=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        tax_rate=Decimal("13.00"),
        tax_amount=Decimal("130.00"),
        line_total=Decimal("1130.00")
    )
    # Assign valid 13-digit CAByS
    item.cabys_code = "6339900000000"
    item.unit_of_measure = "Unid"
    sale.items = [item]

    # 1. Generate XML with XSD validation enabled
    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="04",
        numeric_key="50631082600310188899900100001040000000001112345678",
        consecutive_number="00100001040000000001",
        sale=sale,
        org=sample_organization,
        branch=branch,
        validate_xsd=True
    )
    assert "<TiqueteElectronico" in xml_str
    assert "<CodigoCABYS>6339900000000</CodigoCABYS>" in xml_str
    assert "<CodigoTarifaIVA>08</CodigoTarifaIVA>" in xml_str

    # 2. Reject dummy CAByS 0000000000000
    item.cabys_code = "0000000000000"
    with pytest.raises(BadRequestException) as exc_info:
        HaciendaXMLGeneratorV44.generate_xml(
            doc_type="04",
            numeric_key="50631082600310188899900100001040000000001112345678",
            consecutive_number="00100001040000000001",
            sale=sale,
            org=sample_organization,
            branch=branch
        )
    assert "Código CAByS" in str(exc_info.value)

@pytest.mark.asyncio
async def test_xades_epes_signature_and_verification():
    pin = "1234"
    p12_bytes = generate_test_p12(pin=pin)

    sample_xml = """<?xml version="1.0" encoding="utf-8"?>
<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico">
    <Clave>50631082600310188899900100001040000000001112345678</Clave>
    <CodigoActividad>521101</CodigoActividad>
    <NumeroConsecutivo>00100001040000000001</NumeroConsecutivo>
    <FechaEmision>2026-08-31T14:55:00-06:00</FechaEmision>
    <Emisor>
        <Nombre>Minimarket El Sol S.A.</Nombre>
        <Identificacion>
            <Tipo>02</Tipo>
            <Numero>3101888999</Numero>
        </Identificacion>
        <Ubicacion>
            <Provincia>1</Provincia>
            <Canton>01</Canton>
            <Distrito>01</Distrito>
            <OtrasSenas>San Jose</OtrasSenas>
        </Ubicacion>
        <CorreoElectronico>facturacion@elsol.cr</CorreoElectronico>
    </Emisor>
    <CondicionVenta>01</CondicionVenta>
    <MedioPago>01</MedioPago>
    <DetalleServicio>
        <LineaDetalle>
            <NumeroLinea>1</NumeroLinea>
            <CodigoCabys>6339900000000</CodigoCabys>
            <Cantidad>1.000</Cantidad>
            <UnidadMedida>Unid</UnidadMedida>
            <Detalle>Arroz Grano Entero 1kg</Detalle>
            <PrecioUnitario>1130.00000</PrecioUnitario>
            <MontoTotal>1130.00</MontoTotal>
            <SubTotal>1130.00</SubTotal>
            <Impuesto>
                <Codigo>01</Codigo>
                <CodigoTarifa>08</CodigoTarifa>
                <Tarifa>13.00</Tarifa>
                <Monto>130.00</Monto>
            </Impuesto>
            <MontoTotalLinea>1130.00</MontoTotalLinea>
        </LineaDetalle>
    </DetalleServicio>
    <ResumenFactura>
        <CodigoTipoMoneda>
            <CodigoMoneda>CRC</CodigoMoneda>
            <TipoCambio>1.00000</TipoCambio>
        </CodigoTipoMoneda>
        <TotalServGravados>0.00</TotalServGravados>
        <TotalServExentos>0.00</TotalServExentos>
        <TotalMercanciasGravadas>1000.00</TotalMercanciasGravadas>
        <TotalMercanciasExentas>0.00</TotalMercanciasExentas>
        <TotalGravado>1000.00</TotalGravado>
        <TotalExento>0.00</TotalExento>
        <TotalVenta>1000.00</TotalVenta>
        <TotalDescuentos>0.00</TotalDescuentos>
        <TotalVentaNeta>1000.00</TotalVentaNeta>
        <TotalImpuesto>130.00</TotalImpuesto>
        <TotalComprobante>1130.00</TotalComprobante>
    </ResumenFactura>
    <ProveedorSistemas>
        <Identificacion>
            <Tipo>02</Tipo>
            <Numero>3101000000</Numero>
        </Identificacion>
        <RazonSocial>ORBITICA STUDIO S.A.</RazonSocial>
    </ProveedorSistemas>
</TiqueteElectronico>"""

    # 1. Sign XML
    signed_xml = XAdESSignerV44.sign_xml(
        xml_content=sample_xml,
        p12_bytes=p12_bytes,
        pin=pin
    )

    assert "ds:Signature" in signed_xml
    assert "ds:SignedInfo" in signed_xml
    assert "ds:SignatureValue" in signed_xml
    assert "xades:QualifyingProperties" in signed_xml
    assert "xades:SignedProperties" in signed_xml

    # 2. Verify signature cryptographically
    is_valid = XAdESSignerV44.verify_signature(signed_xml)
    assert is_valid is True

    # 3. Mutate signed XML -> verification MUST fail (tampering protection)
    tampered_xml = signed_xml.replace("1130.00", "9999.00")
    is_tampered_valid = XAdESSignerV44.verify_signature(tampered_xml)
    assert is_tampered_valid is False

@pytest.mark.asyncio
async def test_hacienda_credentials_endpoint(client: AsyncClient, sample_organization: Organization):
    # 1. Login with owner
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload test P12
    p12_bytes = generate_test_p12(pin="1234")
    p12_b64 = base64.b64encode(p12_bytes).decode("utf-8")

    save_res = await client.post("/api/v1/hacienda/credentials", json={
        "environment": "STAGING",
        "atv_username": "cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr",
        "atv_password": "TestPassword123!",
        "pin": "1234",
        "p12_base64": p12_b64
    }, headers=headers)
    assert save_res.status_code == 200
    assert save_res.json()["data"]["has_certificate"] is True

    # 3. Retrieve status
    status_res = await client.get("/api/v1/hacienda/credentials", headers=headers)
    assert status_res.status_code == 200
    data = status_res.json()["data"]
    assert data["has_certificate"] is True
    assert data["is_active"] is True
