from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class SaleItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    discount_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)

class SalePaymentCreate(BaseModel):
    payment_method: str = Field(default="CASH_CRC")  # CASH_CRC, CASH_USD, CARD, SINPE, TRANSFER
    amount: Decimal = Field(gt=0)
    reference_number: Optional[str] = None

class SaleCreate(BaseModel):
    branch_id: UUID
    cash_session_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    items: List[SaleItemCreate] = Field(min_length=1)
    payments: List[SalePaymentCreate] = Field(min_length=1)
    notes: Optional[str] = None
    currency: str = Field(default="CRC")

class SaleItemResponse(BaseSchema):
    id: UUID
    product_id: UUID
    product_name: str
    product_sku: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    unit_cost: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

class SalePaymentResponse(BaseSchema):
    id: UUID
    payment_method: str
    amount: Decimal
    change_returned: Decimal
    reference_number: Optional[str] = None
    created_at: datetime

class SaleResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    branch_id: UUID
    branch_name: Optional[str] = None
    cash_session_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    user_id: UUID
    user_name: Optional[str] = None
    sale_number: str
    currency: str
    subtotal_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: str
    notes: Optional[str] = None
    created_at: datetime
    items: List[SaleItemResponse] = []
    payments: List[SalePaymentResponse] = []

class RefundRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)
