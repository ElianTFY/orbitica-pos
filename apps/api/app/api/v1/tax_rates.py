from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.catalog import TaxRateCreate, TaxRateResponse
from app.schemas.common import StandardResponse
from app.services.catalog_service import CatalogService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/tax-rates", tags=["Tax Rates"])

@router.get("", response_model=StandardResponse[List[TaxRateResponse]])
async def list_tax_rates(
    context: CurrentUserContext = Depends(require_permissions("catalog:read")),
    db: AsyncSession = Depends(get_db)
):
    service = CatalogService(db, context.organization_id)
    taxes = await service.list_tax_rates()
    return StandardResponse(data=[TaxRateResponse.model_validate(t) for t in taxes])

@router.post("", response_model=StandardResponse[TaxRateResponse], status_code=status.HTTP_201_CREATED)
async def create_tax_rate(
    payload: TaxRateCreate,
    context: CurrentUserContext = Depends(require_permissions("catalog:create")),
    db: AsyncSession = Depends(get_db)
):
    service = CatalogService(db, context.organization_id)
    tax = await service.create_tax_rate(payload)
    return StandardResponse(data=TaxRateResponse.model_validate(tax), message="Tarifa de impuesto creada")
