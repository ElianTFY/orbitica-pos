import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    # 1. Basic health
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "healthy"
    assert "version" in data

    # 2. Liveness
    live_resp = await client.get("/health/live")
    assert live_resp.status_code == 200
    assert live_resp.json()["data"]["status"] == "live"

    # 3. Readiness
    ready_resp = await client.get("/health/ready")
    assert ready_resp.status_code == 200
    ready_data = ready_resp.json()["data"]
    assert ready_data["status"] == "ready"
    assert ready_data["checks"]["database"] == "connected"
