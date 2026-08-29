import pytest
import pytest_asyncio
import uuid
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.security.password import hash_password
from app.core.constants import UserRole

@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    # Isolated in-memory DB per test
    test_db_url = f"sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(test_db_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def superadmin_user(db_session: AsyncSession) -> User:
    user = User(
        email="superadmin@orbitica.cr",
        password_hash=hash_password("SuperSecret123!"),
        full_name="Superadmin Orbítica",
        role=UserRole.SUPERADMIN,
        organization_id=None
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest_asyncio.fixture
async def sample_organization(db_session: AsyncSession) -> Organization:
    org = Organization(
        legal_name="Comercializadora El Sol S.A.",
        trade_name="Supermercado El Sol",
        identification_type="JURIDICA",
        identification_number=f"3101{uuid.uuid4().hex[:6]}",
        email="contacto@elsol.cr",
        country_code="CR",
        default_currency="CRC"
    )
    db_session.add(org)
    await db_session.flush()

    branch = Branch(
        organization_id=org.id,
        code="001",
        name="Sucursal Central",
        is_main=True
    )
    db_session.add(branch)
    await db_session.flush()

    owner = User(
        organization_id=org.id,
        email="owner@elsol.cr",
        password_hash=hash_password("OwnerPassword123!"),
        full_name="Carlos Propietario",
        role=UserRole.OWNER
    )
    db_session.add(owner)
    await db_session.flush()

    access = UserBranchAccess(user_id=owner.id, branch_id=branch.id, is_default=True)
    db_session.add(access)

    await db_session.commit()
    await db_session.refresh(org)
    return org
