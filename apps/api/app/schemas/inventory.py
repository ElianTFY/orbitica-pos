from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class InventoryAdjustmentCreate(BaseModel):
    branch_id: UUID
    product_id: UUID
    quantity: Decimal  # Positive for adding stock, negative for reduction
    movement_type: str = Field(default="ADJUSTMENT_IN")  # ADJUSTMENT_IN, ADJUSTMENT_OUT, IN_PURCHASE, WASTE
    reason: str = Field(min_length=3, max_length=500)

class InventoryTransferCreate(BaseModel):
    from_branch_id: UUID
    to_branch_id: UUID
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    reason: Optional[str] = None

class InventoryMovementResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    branch_id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    actor_id: UUID
    actor_name: Optional[str] = None
    movement_type: str
    quantity: Decimal
    previous_quantity: Decimal
    new_quantity: Decimal
    reference_id: Optional[UUID] = None
    reason: Optional[str] = None
    created_at: datetime

class LowStockItemResponse(BaseSchema):
    product_id: UUID
    product_name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_name: Optional[str] = None
    branch_id: UUID
    branch_name: str
    current_stock: Decimal
    min_stock_alert: Decimal
