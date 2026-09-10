from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.schemas.common import StandardResponse
from app.services.customer_service import CustomerService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=StandardResponse[List[CustomerResponse]])
async def list_customers(
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("customers:read")),
    db: AsyncSession = Depends(get_db)
):
    service = CustomerService(db, context.organization_id)
    customers = await service.list_customers(search=search, limit=limit, offset=offset)
    return StandardResponse(data=[CustomerResponse.model_validate(c) for c in customers])

@router.post("", response_model=StandardResponse[CustomerResponse], status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    context: CurrentUserContext = Depends(require_permissions("customers:create")),
    db: AsyncSession = Depends(get_db)
):
    service = CustomerService(db, context.organization_id)
    customer = await service.create_customer(payload, actor_id=context.user_id)
    return StandardResponse(
        data=CustomerResponse.model_validate(customer),
        message="Cliente registrado exitosamente"
    )

@router.get("/{customer_id}", response_model=StandardResponse[CustomerResponse])
async def get_customer(
    customer_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("customers:read")),
    db: AsyncSession = Depends(get_db),
):
    customer = await CustomerService(db, context.organization_id).get_customer(customer_id)
    return StandardResponse(data=CustomerResponse.model_validate(customer))

@router.patch("/{customer_id}", response_model=StandardResponse[CustomerResponse])
async def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    context: CurrentUserContext = Depends(require_permissions("customers:update")),
    db: AsyncSession = Depends(get_db),
):
    customer = await CustomerService(db, context.organization_id).update_customer(
        customer_id, payload, actor_id=context.user_id
    )
    return StandardResponse(data=CustomerResponse.model_validate(customer))

@router.delete("/{customer_id}", response_model=StandardResponse[dict])
async def delete_customer(
    customer_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("customers:delete")),
    db: AsyncSession = Depends(get_db),
):
    customer = await CustomerService(db, context.organization_id).update_customer(
        customer_id, CustomerUpdate(is_active=False), actor_id=context.user_id
    )
    return StandardResponse(data={"id": str(customer.id), "is_active": False})
