import pytest
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
