import pytest
import xml.etree.ElementTree as ET
from httpx import AsyncClient
from app.models.organization import Organization
from app.services.xades_signer import XAdESSigner
from app.services.electronic_invoicing_service import generate_ephemeral_p12

@pytest.mark.asyncio
async def test_xades_signature_generation():
    pin = "5678"
    p12_bytes = generate_ephemeral_p12(pin=pin)
    assert len(p12_bytes) > 100

    sample_xml = """<?xml version="1.0" encoding="utf-8"?>
<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/tiqueteElectronico">
    <Clave>50629082600310188899900100001040000000001112345678</Clave>
    <CodigoActividad>521101</CodigoActividad>
    <NumeroConsecutivo>00100001040000000001</NumeroConsecutivo>
    <FechaEmision>2026-08-30T14:55:00-06:00</FechaEmision>
    <Emisor>
        <Nombre>Minimarket San José Express</Nombre>
        <Identificacion>
            <Tipo>02</Tipo>
            <Numero>3101888999</Numero>
        </Identificacion>
    </Emisor>
    <CondicionVenta>01</CondicionVenta>
    <MedioPago>01</MedioPago>
    <ResumenFactura>
        <CodigoTipoMoneda>CRC</CodigoTipoMoneda>
        <TotalComprobante>1000.00</TotalComprobante>
    </ResumenFactura>
</TiqueteElectronico>"""

    signed_xml = XAdESSigner.sign_xml(
        xml_string=sample_xml,
        p12_data=p12_bytes,
        pin=pin
    )

    assert "SignedInfo" in signed_xml
    assert "SignatureValue" in signed_xml
    assert "QualifyingProperties" in signed_xml
    assert "SigningCertificate" in signed_xml

    parsed = ET.fromstring(signed_xml)
    assert parsed.tag.endswith("TiqueteElectronico")

@pytest.mark.asyncio
async def test_hacienda_endpoints_workflow(client: AsyncClient, sample_organization: Organization):
    # 1. Login with owner from fixture
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test credentials retrieval
    creds_res = await client.get("/api/v1/hacienda/credentials", headers=headers)
    assert creds_res.status_code == 200
    assert creds_res.json()["data"]["has_certificate"] is True

    # 3. Test connection simulation
    test_conn_res = await client.post("/api/v1/hacienda/test-connection", json={
        "environment": "STAGING",
        "atv_username": "cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr",
        "atv_password": "TestPassword123!",
        "pin": "1234"
    }, headers=headers)
    assert test_conn_res.status_code == 200
    assert test_conn_res.json()["data"]["success"] is True

    # 4. Create category, product, stock and sale
    cat_res = await client.post("/api/v1/categories", json={
        "name": "Bebidas Frecuentes",
        "description": "Refrescos y aguas"
    }, headers=headers)
    cat_id = cat_res.json()["data"]["id"]

    tax_rates = await client.get("/api/v1/tax-rates", headers=headers)
    tax_13_id = tax_rates.json()["data"][0]["id"]

    prod_res = await client.post("/api/v1/products", json={
        "category_id": cat_id,
        "tax_rate_id": tax_13_id,
        "name": "Gaseosa Tropical 500ml",
        "sku": "TROP-500",
        "barcode": "7441009999",
        "sale_price": 1000,
        "cost_price": 600,
        "min_stock_alert": 5
    }, headers=headers)
    prod_id = prod_res.json()["data"]["id"]

    branches = await client.get("/api/v1/branches", headers=headers)
    b_id = branches.json()["data"][0]["id"]

    # Adjust initial stock
    await client.post("/api/v1/inventory/adjust", json={
        "branch_id": b_id,
        "product_id": prod_id,
        "quantity": 20,
        "movement_type": "IN_PURCHASE",
        "reason": "Stock inicial para prueba de Hacienda"
    }, headers=headers)

    sale_res = await client.post("/api/v1/sales", json={
        "branch_id": b_id,
        "items": [
            {"product_id": prod_id, "quantity": 1, "discount_percentage": 0}
        ],
        "payments": [
            {"payment_method": "CASH_CRC", "amount": 1000}
        ]
    }, headers=headers)
    assert sale_res.status_code == 201
    sale_id = sale_res.json()["data"]["id"]

    # 5. Transmit Sale to Hacienda with XAdES-BES signature
    transmit_res = await client.post("/api/v1/hacienda/transmit", json={
        "sale_id": sale_id
    }, headers=headers)
    assert transmit_res.status_code == 200
    t_data = transmit_res.json()["data"]
    assert len(t_data["clave"]) == 50
    assert len(t_data["consecutive"]) == 20
    assert t_data["hacienda_status"] in ("SENT_TO_HACIENDA", "ACCEPTED")
    inv_id = t_data["invoice_id"]

    # 6. Check Invoice Status
    status_res = await client.get(f"/api/v1/hacienda/{inv_id}/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["data"]["ind_estado"] == "aceptado"
