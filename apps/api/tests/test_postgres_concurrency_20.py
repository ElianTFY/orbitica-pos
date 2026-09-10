import pytest
import asyncio
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
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

    # SQLAlchemy AsyncSession is not concurrency-safe. Use one independent
    # transaction/session per simulated POS terminal.
    session_factory = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)

    async def next_value() -> int:
        async with session_factory() as session:
            value = await ConsecutiveService(session).get_next_consecutive_atomic(
                organization_id=sample_organization.id,
                branch_code="001",
                terminal_number="00001",
                doc_type="01",
                environment="STAGING",
            )
            await session.commit()
            return value

    tasks = [next_value() for _ in range(20)]
    consecutives = await asyncio.gather(*tasks)

    # All 20 numbers must be strictly unique and distinct
    assert len(set(consecutives)) == 20
    assert len(consecutives) == 20


@pytest.mark.postgres_integration
@pytest.mark.asyncio
async def test_postgres_20_checkout_retries_commit_one_sale(db_session, sample_organization):
    from app.models.user import User
    from app.models.branch import Branch
    from app.models.catalog import TaxRate
    from app.models.sale import Sale
    from app.services.sale_service import SaleService
    from app.schemas.sale import SaleCreate, SaleResponse
    from sqlalchemy import func

    org_id = sample_organization.id
    branch = (await db_session.execute(select(Branch).where(Branch.organization_id == org_id))).scalars().first()
    owner = (await db_session.execute(select(User).where(User.organization_id == org_id))).scalars().first()
    tax = (await db_session.execute(select(TaxRate).where(TaxRate.organization_id == org_id, TaxRate.rate == 13))).scalars().first()
    product = Product(organization_id=org_id, name='PG checkout concurrency', sale_price=Decimal('1130'),
                      cost_price=Decimal('700'), tax_rate_id=tax.id, cabys_code='2132100000100', is_service=False)
    db_session.add(product)
    await db_session.flush()
    db_session.add(BranchProductStock(branch_id=branch.id, product_id=product.id, quantity=1))
    await db_session.commit()
    payload = SaleCreate(branch_id=branch.id, items=[{'product_id': product.id, 'quantity': 1}],
                         payments=[{'payment_method': 'CARD', 'amount': 1130}])
    key = f'concurrent-sale-{uuid.uuid4()}'
    request_hash = IdempotencyService.compute_request_hash(payload.model_dump(mode='json'))
    sessions = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)

    async def checkout():
        async with sessions() as session:
            idem = IdempotencyService(session, org_id)
            cached, record = await idem.start_or_get_idempotent_operation('SALE_CREATE', key, request_hash)
            if cached:
                return SaleResponse.model_validate_json(record.response_payload).id
            sale = await SaleService(session, org_id).create_sale(payload, owner.id, commit=False)
            response = SaleResponse.model_validate(sale)
            await idem.complete_idempotent_operation('SALE_CREATE', key, response.model_dump_json(), 201)
            return response.id

    sale_ids = await asyncio.gather(*(checkout() for _ in range(20)))
    assert len(set(sale_ids)) == 1
    assert (await db_session.execute(select(func.count()).select_from(Sale).where(Sale.organization_id == org_id))).scalar_one() == 1
    stock = (await db_session.execute(select(BranchProductStock.quantity).where(BranchProductStock.product_id == product.id))).scalar_one()
    assert stock == 0
