import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_hacienda_receipt_and_supplier_purchases(client: AsyncClient, sample_organization):
    # Login Owner
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get branch
    branches_resp = await client.get("/api/v1/branches", headers=headers)
    branch_id = branches_resp.json()["data"][0]["id"]

    # 2. Register Supplier
    supp_payload = {
        "name": "Distribuidora La Florida S.A.",
        "identification_number": "3101112233",
        "identification_type": "02",
        "email": "ventas@laflorida.cr",
        "phone": "2430-1000",
        "address": "Alajuela, Costa Rica"
    }
    supp_resp = await client.post("/api/v1/suppliers", json=supp_payload, headers=headers)
    assert supp_resp.status_code == 201
    supp_id = supp_resp.json()["data"]["id"]

    # 3. Create Category and Get Tax Rate for Product
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Bebidas y Refrescos"},
        headers=headers
    )
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["data"]["id"]

    taxes = await client.get("/api/v1/tax-rates", headers=headers)
    tax_id = taxes.json()["data"][0]["id"]

    # 4. Create Product with valid CAByS
    prod_resp = await client.post(
        "/api/v1/products",
        json={
            "name": "Jugo Naranja 500ml",
            "sku": "JUGO-500",
            "barcode": "744100998877",
            "cabys_code": "6339900000000",
            "unit_of_measure": "Unid",
            "cost_price": 500,
            "sale_price": 850,
            "category_id": cat_id,
            "tax_rate_id": tax_id,
            "initial_stock": 10,
            "branch_id": branch_id
        },
        headers=headers
    )
    assert prod_resp.status_code == 201
    prod_id = prod_resp.json()["data"]["id"]

    # 5. Record Purchase from Supplier (Stock intake)
    purchase_payload = {
        "supplier_id": supp_id,
        "branch_id": branch_id,
        "invoice_number": "FAC-2026-9901",
        "payment_method": "TRANSFER",
        "currency": "CRC",
        "items": [
            {
                "product_id": prod_id,
                "quantity": 25,
                "unit_cost": 480,
                "tax_rate": 13.00
            }
        ]
    }
    purch_resp = await client.post("/api/v1/purchases", json=purchase_payload, headers=headers)
    assert purch_resp.status_code == 201
    assert purch_resp.json()["data"]["status"] == "COMPLETED"

    # Verify inventory movement was logged
    inv_resp = await client.get("/api/v1/inventory/movements", headers=headers)
    assert inv_resp.status_code == 200

    # 6. Make a POS Sale of this Product with Idempotency Key
    sale_payload = {
        "branch_id": branch_id,
        "currency": "CRC",
        "items": [
            {
                "product_id": prod_id,
                "quantity": 2,
                "discount_percentage": 0
            }
        ],
        "payments": [
            {
                "payment_method": "CASH_CRC",
                "amount": 1921 # (850*2) = 1700 total with tax
            }
        ]
    }
    sale_headers = {**headers, "Idempotency-Key": "test_sale_key_001"}
    sale_resp = await client.post("/api/v1/sales", json=sale_payload, headers=sale_headers)
    assert sale_resp.status_code == 201
    sale_id = sale_resp.json()["data"]["id"]

    # Retry same sale with same Idempotency-Key -> returns cached response
    retry_sale_resp = await client.post("/api/v1/sales", json=sale_payload, headers=sale_headers)
    assert retry_sale_resp.status_code == 201
    assert retry_sale_resp.headers.get("x-cache-lookup") == "HIT"
    assert retry_sale_resp.json()["data"]["id"] == sale_id

    # 7. Get Thermal Receipt Payload (80mm / 58mm POS receipt)
    receipt_resp = await client.get(f"/api/v1/sales/{sale_id}/receipt", headers=headers)
    assert receipt_resp.status_code == 200
    receipt_data = receipt_resp.json()["data"]
    assert "store" in receipt_data
    assert "hacienda" in receipt_data
    assert "items" in receipt_data
    assert len(receipt_data["items"]) == 1
    assert "04 Tiquete" in receipt_data["hacienda"]["doc_type"]
    assert len(receipt_data["hacienda"]["numeric_key"]) == 50

    # 8. Get Hacienda XML Comprobante (v4.4 Schema)
    xml_resp = await client.get(f"/api/v1/sales/{sale_id}/xml", headers=headers)
    assert xml_resp.status_code == 200
    assert "application/xml" in xml_resp.headers.get("content-type", "")
    assert "<TiqueteElectronico" in xml_resp.text
    assert "<Clave>" in xml_resp.text
    assert "v4.4/tiqueteElectronico" in xml_resp.text
    assert "<ProveedorSistemas>" in xml_resp.text
