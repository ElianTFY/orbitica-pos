import pytest
import asyncio
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.config import settings
from app.models.catalog import Product, BranchProductStock
from app.models.idempotency import IdempotencyRecord
from app.services.idempotency_service import IdempotencyService
from app.services.consecutive_service import ConsecutiveService

@pytest.mark.postgres_integration
@pytest.mark.asyncio
async def test_postgres_20_concurrent_consecutive_increments(db_session: AsyncSession, sample_organization):
    """
    Mandato de Auditoría:
    Valida 20 incrementos simultáneos de consecutivos en PostgreSQL 16 con asyncio.gather.
    Rechaza explícitamente SQLite para garantizar la prueba de concurrencia real.
    """
    bind = db_session.bind
    dialect_name = bind.dialect.name if bind else "unknown"

    if dialect_name == "sqlite" or "sqlite" in settings.DATABASE_URL.lower():
        pytest.fail(
            f"VIOLACIÓN DE AUDITORÍA: Concurrencia real no puede validarse en '{dialect_name}'. "
            "Se requiere una instancia real de PostgreSQL 16."
        )

    # 20 concurrent consecutive requests
    service = ConsecutiveService(db_session)
    tasks = [
        service.get_next_consecutive_atomic(
            organization_id=sample_organization.id,
            branch_code="001",
            terminal_number="00001",
            doc_type="01",
            environment="staging"
        )
        for _ in range(20)
    ]
    consecutives = await asyncio.gather(*tasks)

    # All 20 numbers must be strictly unique and distinct
    assert len(set(consecutives)) == 20
    assert len(consecutives) == 20
