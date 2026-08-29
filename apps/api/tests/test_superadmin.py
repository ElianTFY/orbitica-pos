import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.organization import Organization

@pytest.mark.asyncio
async def test_superadmin_platform_management(client: AsyncClient, superadmin_user: User, sample_organization: Organization):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@orbitica.cr", "password": "SuperSecret123!"}
    )
    assert login_resp.status_code == 200
    sa_token = login_resp.json()["data"]["access_token"]

    # Get platform stats
    stats_resp = await client.get("/api/v1/superadmin/stats", headers={"Authorization": f"Bearer {sa_token}"})
    assert stats_resp.status_code == 200
    stats = stats_resp.json()["data"]
    assert stats["total_organizations"] >= 1

    # Toggle organization status
    suspend_resp = await client.patch(
        f"/api/v1/superadmin/organizations/{sample_organization.id}/status?is_active=false",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert suspend_resp.status_code == 200
    assert suspend_resp.json()["data"]["is_active"] is False
