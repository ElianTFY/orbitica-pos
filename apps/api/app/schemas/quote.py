from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class QuoteItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    discount_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)

class QuoteCreate(BaseModel):
    branch_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    items: List[QuoteItemCreate] = Field(min_length=1)
    currency: str = Field(default="CRC")
    notes: Optional[str] = None
    valid_days: int = Field(default=15, ge=1, le=90)

class QuoteItemResponse(BaseSchema):
    id: UUID
    product_id: UUID
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

class QuoteResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    branch_id: UUID
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    user_id: UUID
    quote_number: str
    currency: str
    subtotal_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: str
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    converted_sale_id: Optional[UUID] = None
    created_at: datetime
    items: List[QuoteItemResponse] = []

class QuoteConvertToSaleRequest(BaseModel):
    payment_method: str = Field(default="CASH_CRC")
    cash_session_id: Optional[UUID] = None
    sinpe_reference: Optional[str] = None
