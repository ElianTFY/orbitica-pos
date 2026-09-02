import uuid
import pytest
from decimal import Decimal
from app.services.storage_service import (
    StorageService,
    LocalTenantStorageBackend,
    S3TenantStorageBackend
)
from app.services.email_service import FiscalEmailService
from app.adapters.email_adapter import ConsoleEmailAdapter

@pytest.mark.asyncio
async def test_local_storage_tenant_isolation_and_path_traversal_prevention(tmp_path):
    storage_dir = str(tmp_path / "fiscal_storage")
    backend = LocalTenantStorageBackend(base_dir=storage_dir)
    service = StorageService(backend=backend)

    org1 = uuid.uuid4()
    org2 = uuid.uuid4()

    key1 = "50602092600310199988800100001010000000000111234567"
    signed_xml = "<FacturaElectronica>ORG1_DATA</FacturaElectronica>"
    resp_xml = "<MensajeHacienda>ACEPTADO</MensajeHacienda>"

    # 1. Save for Org 1
    paths = await service.save_fiscal_xml(
        organization_id=org1,
        numeric_key=key1,
        signed_xml=signed_xml,
        hacienda_response_xml=resp_xml
    )
    assert f"{org1}/invoices/xml" in paths["signed_xml_key"]

    # 2. Read back for Org 1
    read_xml = await service.read_fiscal_xml(org1, paths["signed_xml_key"])
    assert read_xml == signed_xml

    # 3. Org 2 cannot read Org 1 files directly via cross-tenant attempt
    with pytest.raises(FileNotFoundError):
        await service.read_fiscal_xml(org2, paths["signed_xml_key"])

    # 4. Path traversal attempt must be blocked
    with pytest.raises(PermissionError):
        await backend.read(str(org1), "../../../etc/passwd")

@pytest.mark.asyncio
async def test_s3_storage_tenant_isolation():
    s3_backend = S3TenantStorageBackend(bucket_name="fiscal-vault-cr")
    service = StorageService(backend=s3_backend)

    org_id = uuid.uuid4()
    key = "50602092600310199988800100001040000000000211234567"
    signed_xml = "<TiqueteElectronico>TIQUETE_DATA</TiqueteElectronico>"

    paths = await service.save_fiscal_xml(
        organization_id=org_id,
        numeric_key=key,
        signed_xml=signed_xml
    )
    assert paths["signed_xml_key"].startswith(f"tenants/{org_id}/")

    read_data = await service.read_fiscal_xml(org_id, paths["signed_xml_key"])
    assert read_data == signed_xml

@pytest.mark.asyncio
async def test_fiscal_email_dispatch_with_xml_attachments_and_fallback():
    console_adapter = ConsoleEmailAdapter()
    email_service = FiscalEmailService(adapter=console_adapter)

    numeric_key = "50602092600310199988800100001010000000000111234567"
    signed_xml = "<FacturaElectronica><Clave>506020926003101999888</Clave></FacturaElectronica>"
    response_xml = "<MensajeHacienda><Estado>1</Estado></MensajeHacienda>"

    success = await email_service.send_invoice_email(
        to_email="cliente@ejemplo.cr",
        issuer_name="SUPERMERCADO CENTRAL S.A.",
        customer_name="CLIENTE FRECUENTE S.A.",
        consecutive_number="00100001010000000001",
        numeric_key=numeric_key,
        total_amount=Decimal("15250.00"),
        currency="CRC",
        signed_xml=signed_xml,
        hacienda_response_xml=response_xml
    )

    assert success is True
    assert len(console_adapter.sent_emails) == 1

    sent = console_adapter.sent_emails[0]
    assert sent["to"] == "cliente@ejemplo.cr"
    assert "SUPERMERCADO CENTRAL" in sent["subject"]
    assert "15,250.00" in sent["html"]
    assert numeric_key in sent["html"]

    # Verify attachments
    attachments = sent["attachments"]
    assert len(attachments) == 2
    assert attachments[0]["filename"] == f"{numeric_key}.xml"
    assert attachments[0]["content"] == signed_xml.encode("utf-8")
    assert attachments[1]["filename"] == f"{numeric_key}_respuesta.xml"
    assert attachments[1]["content"] == response_xml.encode("utf-8")
