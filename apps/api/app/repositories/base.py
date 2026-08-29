from typing import Generic, TypeVar, Type, Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID, tenant_id: Optional[UUID] = None) -> Optional[ModelType]:
        query = select(self.model).where(self.model.id == id)
        if tenant_id and hasattr(self.model, "organization_id"):
            query = query.where(self.model.organization_id == tenant_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        tenant_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        is_active_only: bool = True
    ) -> List[ModelType]:
        query = select(self.model)
        if tenant_id and hasattr(self.model, "organization_id"):
            query = query.where(self.model.organization_id == tenant_id)
        if is_active_only and hasattr(self.model, "is_active"):
            query = query.where(self.model.is_active == True)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())
