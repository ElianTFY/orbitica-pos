import pytest
from decimal import Decimal
from httpx import AsyncClient
from app.core.cabys_catalog import (
    validate_cabys_and_rate,
    map_fiscal_v44_tax_tariff,
    OFFICIAL_CABYS_CATALOG,
    DEFAULT_OFFICIAL_CABYS,
    VALID_UNITS_OF_MEASURE
)
from app.models.sale import SaleItem

def test_cabys_catalog_rejects_invented_and_malformed_codes():
    # Must reject invented code 5211010000100
    with pytest.raises(ValueError, match="es ficticio y fue expresamente revocado"):
        validate_cabys_and_rate("5211010000100", Decimal("13.00"), "Unid")

    # Must reject 0000000000000
    with pytest.raises(ValueError, match="es un marcador nulo"):
        validate_cabys_and_rate("0000000000000", Decimal("13.00"), "Unid")

    # Must reject non-13 digits
    with pytest.raises(ValueError, match="13 dígitos"):
        validate_cabys_and_rate("12345", Decimal("13.00"), "Unid")

    with pytest.raises(ValueError, match="13 dígitos"):
        validate_cabys_and_rate("12345678901234", Decimal("13.00"), "Unid")

    # Must reject non-standard units
    with pytest.raises(ValueError, match="Unidad de medida 'CAJA' inválida"):
        validate_cabys_and_rate(DEFAULT_OFFICIAL_CABYS, Decimal("13.00"), "CAJA")

def test_cabys_catalog_accepts_official_bccr_codes():
    for code, info in OFFICIAL_CABYS_CATALOG.items():
        assert len(code) == 13
        assert code.isdigit()
        validate_cabys_and_rate(code, info["default_tax_rate"], info["default_unit"])

def test_hacienda_v44_exact_tax_tariff_mapping():
    # 13% General
    assert map_fiscal_v44_tax_tariff(Decimal("13.00")) == ("01", "08")
    # 8% Reducida
    assert map_fiscal_v44_tax_tariff(Decimal("8.00")) == ("01", "07")
    # 4% Reducida
    assert map_fiscal_v44_tax_tariff(Decimal("4.00")) == ("01", "04")
    # 2% Reducida
    assert map_fiscal_v44_tax_tariff(Decimal("2.00")) == ("01", "03")
    # 1% Reducida
    assert map_fiscal_v44_tax_tariff(Decimal("1.00")) == ("01", "02")
    # 0.5% Reducida
    assert map_fiscal_v44_tax_tariff(Decimal("0.50")) == ("01", "09")
    # 0% Exento
    assert map_fiscal_v44_tax_tariff(Decimal("0.00")) == ("01", "01")
    # Exonerado
    assert map_fiscal_v44_tax_tariff(Decimal("13.00"), is_exonerated=True) == ("01", "10")
    # Sin crédito
    assert map_fiscal_v44_tax_tariff(Decimal("13.00"), without_credit=True) == ("01", "10")

@pytest.mark.asyncio
async def test_product_creation_rejects_fake_cabys_and_accepts_official(client: AsyncClient, sample_organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    taxes = await client.get("/api/v1/tax-rates", headers=headers)
    tax_id = taxes.json()["data"][0]["id"]

    # 1. Attempt to create with fake CAByS 5211010000100 -> Must FAIL 422
    bad_resp = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Producto Fake",
            "tax_rate_id": tax_id,
            "cabys_code": "5211010000100",
            "unit_of_measure": "Unid",
            "cost_price": 100,
            "sale_price": 200
        }
    )
    assert bad_resp.status_code == 422

    # 2. Create with official BCCR code -> Must SUCCEED 201
    good_resp = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Arroz con Cáscara para Siembra",
            "tax_rate_id": tax_id,
            "cabys_code": "0112101000100",
            "unit_of_measure": "kg",
            "cost_price": 600,
            "sale_price": 950
        }
    )
    assert good_resp.status_code == 201
    data = good_resp.json()["data"]
    assert data["cabys_code"] == "0112101000100"
    assert data["unit_of_measure"] == "kg"
