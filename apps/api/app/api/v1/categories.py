from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.catalog import CategoryCreate, CategoryResponse
from app.schemas.common import StandardResponse
from app.services.catalog_service import CatalogService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=StandardResponse[List[CategoryResponse]])
async def list_categories(
    context: CurrentUserContext = Depends(require_permissions("catalog:read")),
    db: AsyncSession = Depends(get_db)
):
    service = CatalogService(db, context.organization_id)
    categories = await service.list_categories()
    return StandardResponse(data=[CategoryResponse.model_validate(c) for c in categories])

@router.post("", response_model=StandardResponse[CategoryResponse], status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    context: CurrentUserContext = Depends(require_permissions("catalog:create")),
    db: AsyncSession = Depends(get_db)
):
    service = CatalogService(db, context.organization_id)
    category = await service.create_category(payload, actor_id=context.user_id)
    return StandardResponse(
        data=CategoryResponse.model_validate(category),
        message="Categoría creada exitosamente"
    )
