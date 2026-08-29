import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_category_and_product(client: AsyncClient, sample_organization):
    # Login Owner
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Category
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Lácteos & Quesos", "description": "Leches y quesos nacionales"},
        headers=headers
    )
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["data"]["id"]

    # 2. Get Default Tax Rates
    tax_resp = await client.get("/api/v1/tax-rates", headers=headers)
    assert tax_resp.status_code == 200
    tax_rates = tax_resp.json()["data"]
    tax_13 = tax_rates[0]["id"]

    # 3. Create Product
    prod_payload = {
        "name": "Queso Turrialba 500g",
        "category_id": cat_id,
        "tax_rate_id": tax_13,
        "sku": "LAC-001",
        "barcode": "7441009999",
        "cost_price": 1800,
        "sale_price": 2500,
        "min_stock_alert": 5
    }
    prod_resp = await client.post("/api/v1/products", json=prod_payload, headers=headers)
    assert prod_resp.status_code == 201
    prod_data = prod_resp.json()["data"]
    assert prod_data["name"] == "Queso Turrialba 500g"
    assert prod_data["sku"] == "LAC-001"

    # 4. Lookup by Barcode
    barcode_resp = await client.get("/api/v1/products/barcode/7441009999", headers=headers)
    assert barcode_resp.status_code == 200
    assert barcode_resp.json()["data"]["name"] == "Queso Turrialba 500g"
