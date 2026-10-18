import pytest
import csv
import io
from decimal import Decimal
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_reports_and_subscription_analytics(client: AsyncClient, sample_organization):
    # Login Owner
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@elsol.cr", "password": "OwnerPassword123!"}
    )
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Sales Summary Report
    sales_rep = await client.get("/api/v1/reports/sales-summary", headers=headers)
    assert sales_rep.status_code == 200
    assert "total_sales" in sales_rep.json()["data"]
    assert "payments_breakdown" in sales_rep.json()["data"]

    # 2. Inventory Valuation Report
    val_rep = await client.get("/api/v1/reports/inventory-valuation", headers=headers)
    assert val_rep.status_code == 200
    assert "valuation_at_cost" in val_rep.json()["data"]
    assert "potential_gross_margin" in val_rep.json()["data"]

    # 3. SaaS Subscription Details
    sub_rep = await client.get("/api/v1/subscription", headers=headers)
    assert sub_rep.status_code == 200
    assert sub_rep.json()["data"]["plan_name"] == "Plan Pro Empresarial"
    assert sub_rep.json()["data"]["status"] == "ACTIVE"

    # 4. Audit Trail
    audit_rep = await client.get("/api/v1/audit", headers=headers)
    assert audit_rep.status_code == 200


@pytest.mark.asyncio
async def test_reports_use_all_costs_net_payments_and_original_fiscal_data(client, db_session, sample_organization):
    from tests.test_verified_operations import setup_checkout
    from sqlalchemy import select
    from app.models.invoice import ElectronicInvoice
    headers, branch, product, session, _ = await setup_checkout(client)
    tax = (await client.get('/api/v1/tax-rates', headers=headers)).json()['data'][0]['id']
    items = [{'product_id': product, 'quantity': 1}]
    for index in range(10):
        created = await client.post('/api/v1/products', headers=headers, json={
            'name': f'Producto adicional {index}', 'sale_price': 1130, 'cost_price': 700,
            'tax_rate_id': tax, 'cabys_code': '2132100000100', 'initial_stock': 1, 'branch_id': branch,
        })
        assert created.status_code == 201, created.text
        items.append({'product_id': created.json()['data']['id'], 'quantity': 1})
    sold = await client.post('/api/v1/sales', headers=headers, json={
        'branch_id': branch, 'cash_session_id': session, 'items': items,
        'payments': [{'payment_method': 'CASH_CRC', 'amount': 20000}, {'payment_method': 'CARD', 'amount': 2430}],
    })
    assert sold.status_code == 201, sold.text
    sale = sold.json()['data']
    invoice = (await db_session.execute(select(ElectronicInvoice).where(ElectronicInvoice.id == sale['invoice_id']))).scalar_one()
    # A captured customer name must be safe in a spreadsheet export.
    invoice.fiscal_snapshot = {**invoice.fiscal_snapshot, 'receiver': {'name': '=1+1'}}
    await db_session.commit()
    report = (await client.get('/api/v1/reports/sales-summary', headers=headers)).json()['data']
    assert Decimal(report['total_sales']) == 12430
    assert Decimal(report['total_subtotal']) == 11000
    assert Decimal(report['total_cost']) == 7700  # 11 products, not only the top 10
    assert Decimal(report['estimated_profit']) == 3300  # excludes IVA
    assert len(report['top_products']) == 10
    assert sum(Decimal(row['total_amount']) for row in report['payments_breakdown']) == 12430
    assert sum(Decimal(row['percentage']) for row in report['payments_breakdown']) == 100
    exported = await client.get('/api/v1/reports/sales-export', headers=headers)
    assert exported.status_code == 200
    rows = list(csv.DictReader(io.StringIO(exported.text.lstrip('\ufeff'))))
    assert len(rows) == 1
    assert rows[0]['Clave_Hacienda'] == sale['numeric_key']
    assert rows[0]['Cliente'] == "'=1+1"
    assert rows[0]['Estado_Fiscal'] == 'QUEUED'
    assert (await client.get('/api/v1/reports/sales-summary?start_date=2030-01-01&end_date=2020-01-01', headers=headers)).status_code == 400
    refunded = await client.post(f"/api/v1/sales/{sale['id']}/refund", headers=headers, json={'reason': 'Devolución de prueba'})
    assert refunded.status_code == 200, refunded.text
    report = (await client.get('/api/v1/reports/sales-summary', headers=headers)).json()['data']
    assert report['transaction_count'] == 0
    assert Decimal(report['total_cost']) == 0
    valuation = (await client.get('/api/v1/reports/inventory-valuation', headers=headers)).json()['data']
    assert valuation['total_products'] == 11
    assert Decimal(valuation['valuation_at_cost']) == 9800  # 14 units at 700
    assert Decimal(valuation['potential_gross_margin']) == 4200  # 14 * (1000 - 700), excludes IVA
