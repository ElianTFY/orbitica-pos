from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.catalog import ProductCreate, ProductResponse
from app.schemas.common import StandardResponse
from app.services.catalog_service import CatalogService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=StandardResponse[List[ProductResponse]])
async def list_products(
    category_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    branch_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("catalog:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = CatalogService(db, context.organization_id)
    products = await service.list_products(
        category_id=category_id,
        search=search,
        branch_id=b_id,
        limit=limit,
        offset=offset
    )
    return StandardResponse(data=[ProductResponse.model_validate(p) for p in products])

@router.get("/barcode/{barcode}", response_model=StandardResponse[ProductResponse])
async def get_by_barcode(
    barcode: str,
    branch_id: Optional[UUID] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("catalog:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = CatalogService(db, context.organization_id)
    product = await service.get_product_by_barcode(barcode, branch_id=b_id)
    return StandardResponse(data=ProductResponse.model_validate(product))

@router.post("", response_model=StandardResponse[ProductResponse], status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    context: CurrentUserContext = Depends(require_permissions("catalog:create")),
    db: AsyncSession = Depends(get_db)
):
    service = CatalogService(db, context.organization_id)
    product = await service.create_product(payload, actor_id=context.user_id)
    return StandardResponse(
        data=ProductResponse.model_validate(product),
        message="Producto creado exitosamente"
    )
