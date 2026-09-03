from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteConvertToSaleRequest
from app.schemas.sale import SaleResponse
from app.schemas.common import StandardResponse
from app.services.quote_service import QuoteService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/quotes", tags=["Proforma Quotes"])

@router.post("", response_model=StandardResponse[QuoteResponse], status_code=status.HTTP_201_CREATED)
async def create_quote(
    payload: QuoteCreate,
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    service = QuoteService(db, context.organization_id)
    quote = await service.create_quote(data=payload, user_id=context.user_id)
    return StandardResponse(
        data=QuoteResponse.model_validate(quote),
        message="Cotización proforma generada exitosamente"
    )

@router.get("", response_model=StandardResponse[List[QuoteResponse]])
async def list_quotes(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    service = QuoteService(db, context.organization_id)
    quotes = await service.list_quotes(limit=limit, offset=offset)
    return StandardResponse(
        data=[QuoteResponse.model_validate(q) for q in quotes]
    )

@router.get("/{quote_id}", response_model=StandardResponse[QuoteResponse])
async def get_quote_detail(
    quote_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("pos:read")),
    db: AsyncSession = Depends(get_db)
):
    service = QuoteService(db, context.organization_id)
    quote = await service.get_quote(quote_id)
    return StandardResponse(data=QuoteResponse.model_validate(quote))

@router.post("/{quote_id}/convert-to-sale", response_model=StandardResponse[SaleResponse])
async def convert_to_sale(
    quote_id: UUID,
    payload: QuoteConvertToSaleRequest,
    context: CurrentUserContext = Depends(require_permissions("pos:sell")),
    db: AsyncSession = Depends(get_db)
):
    service = QuoteService(db, context.organization_id)
    sale = await service.convert_quote_to_sale(
        quote_id=quote_id,
        convert_data=payload,
        actor_id=context.user_id
    )
    return StandardResponse(
        data=SaleResponse.model_validate(sale),
        message="Cotización convertida exitosamente a venta en firme"
    )
