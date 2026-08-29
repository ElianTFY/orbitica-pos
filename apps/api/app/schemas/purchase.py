from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class SupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    legal_id: str = Field(min_length=9, max_length=30)
    legal_id_type: str = Field(default="JURIDICA")
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None

class SupplierResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    name: str
    legal_id: str
    legal_id_type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    is_active: bool

class PurchaseItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)
    tax_rate: Decimal = Field(default=Decimal("0.13"))

class PurchaseCreate(BaseModel):
    supplier_id: UUID
    branch_id: Optional[UUID] = None
    invoice_number: str = Field(min_length=1, max_length=50)
    payment_type: str = Field(default="CONTADO") # CONTADO / CREDITO
    notes: Optional[str] = None
    items: List[PurchaseItemCreate] = Field(min_length=1)

class PurchaseItemResponse(BaseSchema):
    product_id: UUID
    product_name: str
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
    supplier_name: Optional[str] = None
    invoice_number: str
    payment_type: str
    status: str
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    created_at: datetime
    items: List[PurchaseItemResponse] = []
