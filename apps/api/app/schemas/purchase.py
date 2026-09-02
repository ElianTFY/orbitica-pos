from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class PurchaseItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)
    tax_rate: Decimal = Field(default=Decimal("13.00"), ge=0, le=100)

class PurchaseCreate(BaseModel):
    branch_id: UUID
    supplier_id: UUID
    invoice_number: Optional[str] = Field(None, max_length=50)
    currency: str = Field(default="CRC", max_length=3)
    payment_method: str = Field(default="TRANSFER", max_length=30)
    notes: Optional[str] = None
    items: List[PurchaseItemCreate] = Field(min_length=1)

class PurchaseItemResponse(BaseSchema):
    id: UUID
    product_id: UUID
    product_name: str
    product_sku: Optional[str] = None
    quantity: Decimal
    unit_cost: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

class PurchaseResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    branch_id: UUID
    supplier_id: UUID
    purchase_number: str
    invoice_number: Optional[str] = None
    currency: str
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: str
    payment_method: str
    notes: Optional[str] = None
    created_at: datetime
    items: List[PurchaseItemResponse] = []
