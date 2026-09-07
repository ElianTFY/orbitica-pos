import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.organization import Organization

@pytest.mark.asyncio
async def test_superadmin_platform_management(client: AsyncClient, superadmin_user: User, sample_organization: Organization):
    import pyotp
    totp = pyotp.TOTP(superadmin_user.totp_secret)
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "superadmin@orbitica.cr",
            "password": "SuperSecret123!",
            "totp_code": totp.now()
        }
    )
    assert login_resp.status_code == 200
    sa_token = login_resp.json()["data"]["access_token"]

    # Get platform stats
    stats_resp = await client.get("/api/v1/superadmin/stats", headers={"Authorization": f"Bearer {sa_token}"})
    assert stats_resp.status_code == 200
    stats = stats_resp.json()["data"]
    assert stats["total_organizations"] >= 1

    action = "Suspensión / Reactivación de Organización"
    resource = f"Tenant #{sample_organization.id}"
    step_up_resp = await client.post(
        "/api/v1/auth/step-up",
        headers={"Authorization": f"Bearer {sa_token}"},
        json={
            "password": "SuperSecret123!",
            "totp_code": totp.now(),
            "action": action,
            "target_resource": resource,
        },
    )
    assert step_up_resp.status_code == 200
    step_up_token = step_up_resp.json()["data"]["step_up_token"]

    # Toggle organization status
    suspend_resp = await client.patch(
        f"/api/v1/superadmin/organizations/{sample_organization.id}/status?is_active=false&reason=Suspension+de+prueba+autorizada",
        headers={
            "Authorization": f"Bearer {sa_token}",
            "X-Step-Up-Token": step_up_token,
        },
    )
    assert suspend_resp.status_code == 200
    assert suspend_resp.json()["data"]["is_active"] is False
