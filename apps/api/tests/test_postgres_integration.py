import pytest
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings

@pytest.mark.postgres_integration
@pytest.mark.asyncio
async def test_postgres_integration_suite_strictly_rejects_sqlite(db_session: AsyncSession):
    """
    Mandato de Auditoría:
    La suite marcada con 'postgres_integration' debe fallar explícitamente si detecta SQLite.
    Garantiza que nadie use SQLite para simular producción, transacciones o concurrencia de PostgreSQL.
    """
    bind = db_session.bind
    dialect_name = bind.dialect.name if bind else "unknown"

    if dialect_name == "sqlite" or "sqlite" in settings.DATABASE_URL.lower():
        pytest.fail(
            f"VIOLACIÓN DE AUDITORÍA: La suite marcada 'postgres_integration' detectó el dialecto '{dialect_name}'. "
            "Está estrictamente prohibido usar SQLite para validar integración o concurrencia de PostgreSQL."
        )

    # If executed with real PostgreSQL connection
    res = await db_session.execute(text("SELECT version();"))
    version_str = res.scalar_one()
    assert "PostgreSQL" in version_str, f"Esperado PostgreSQL, obtenido: {version_str}"
