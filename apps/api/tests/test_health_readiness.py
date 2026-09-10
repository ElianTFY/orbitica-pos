import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from alembic.script import ScriptDirectory

@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient, db_session: AsyncSession):
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
    assert ready_resp.status_code == 503  # create_all is not an applied migration.
    await db_session.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(64) NOT NULL)"))
    await db_session.execute(text("INSERT INTO alembic_version VALUES ('obsolete')"))
    await db_session.commit()
    assert (await client.get("/health/ready")).status_code == 503
    head = ScriptDirectory("app/db/migrations").get_current_head()
    await db_session.execute(text("UPDATE alembic_version SET version_num = :head"), {"head": head})
    await db_session.commit()
    ready_resp = await client.get("/health/ready")
    assert ready_resp.status_code == 200
    ready_data = ready_resp.json()["data"]
    assert ready_data["status"] == "ready"
    assert ready_data["checks"]["database"] == "connected"
