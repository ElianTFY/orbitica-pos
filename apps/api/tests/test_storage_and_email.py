import uuid
import io
import pytest
import boto3
from botocore.response import StreamingBody
from botocore.stub import Stubber
from botocore.exceptions import ClientError
from decimal import Decimal
from app.services.storage_service import (
    StorageService,
    LocalTenantStorageBackend,
    S3TenantStorageBackend
)
from app.services.email_service import FiscalEmailService
from app.adapters.email_adapter import ConsoleEmailAdapter


@pytest.fixture
def s3_client():
    # No cloud credentials or network calls: validate the SDK request contract.
    return boto3.client(
        "s3", region_name="auto", endpoint_url="https://objects.example.test",
        aws_access_key_id="test-access-key", aws_secret_access_key="test-secret-key",
    )

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
async def test_s3_storage_tenant_isolation(s3_client):
    s3_backend = S3TenantStorageBackend(bucket_name="fiscal-vault-cr", client=s3_client)
    service = StorageService(backend=s3_backend)

    org_id = uuid.uuid4()
    key = "50602092600310199988800100001040000000000211234567"
    signed_xml = "<TiqueteElectronico>TIQUETE_DATA</TiqueteElectronico>"

    object_key = f"tenants/{org_id}/invoices/xml/{key}_signed.xml"
    expected = {"Bucket": "fiscal-vault-cr", "Key": object_key}
    with Stubber(s3_client) as stub:
        stub.add_response("put_object", {}, {**expected, "Body": signed_xml.encode()})
        stub.add_response("get_object", {"Body": StreamingBody(io.BytesIO(signed_xml.encode()), len(signed_xml))}, expected)
        paths = await service.save_fiscal_xml(org_id, key, signed_xml)
        assert paths["signed_xml_key"] == object_key
        # A fresh backend must read from the object store, not instance memory.
        second = StorageService(backend=S3TenantStorageBackend("fiscal-vault-cr", client=s3_client))
        assert await second.read_fiscal_xml(org_id, object_key) == signed_xml
        with pytest.raises(FileNotFoundError):
            await second.read_fiscal_xml(uuid.uuid4(), object_key)
        with pytest.raises(PermissionError):
            await s3_backend.read(str(org_id), "../../other-company/document.xml")
        stub.assert_no_pending_responses()


@pytest.mark.asyncio
async def test_s3_missing_objects_and_access_errors_do_not_fall_back_to_memory(s3_client):
    backend = S3TenantStorageBackend("fiscal-vault-cr", client=s3_client)
    org_id = str(uuid.uuid4())
    params = {"Bucket": "fiscal-vault-cr", "Key": f"tenants/{org_id}/uploads/logo.png"}
    with Stubber(s3_client) as stub:
        stub.add_client_error("head_object", service_error_code="404", http_status_code=404, expected_params=params)
        assert not await backend.exists(org_id, "uploads/logo.png")
        stub.add_client_error("get_object", service_error_code="NoSuchKey", http_status_code=404, expected_params=params)
        with pytest.raises(FileNotFoundError):
            await backend.read(org_id, "uploads/logo.png")
        stub.add_client_error("put_object", service_error_code="AccessDenied", http_status_code=403, expected_params={**params, "Body": b"image"})
        with pytest.raises(ClientError):
            await backend.save(org_id, "uploads/logo.png", b"image")
        stub.add_response("head_object", {}, params)
        stub.add_response("delete_object", {}, params)
        assert await backend.delete(org_id, "uploads/logo.png")
        stub.assert_no_pending_responses()


@pytest.mark.asyncio
async def test_local_storage_survives_backend_recreation_and_blocks_symlinks(tmp_path):
    org_id = str(uuid.uuid4())
    backend = LocalTenantStorageBackend(str(tmp_path / "volume"))
    key = await backend.save(org_id, "uploads/logo.png", b"logo")
    assert await LocalTenantStorageBackend(str(tmp_path / "volume")).read(org_id, key) == b"logo"
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "private.txt").write_text("private")
    (tmp_path / "volume" / org_id / "escape").symlink_to(outside, target_is_directory=True)
    with pytest.raises(PermissionError):
        await backend.read(org_id, "escape/private.txt")

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
