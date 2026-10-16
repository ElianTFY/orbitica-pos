from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class CashRegisterCreate(BaseModel):
    branch_id: UUID
    name: str = Field(min_length=2, max_length=100)
    pos_terminal_number: str = Field(default="00001", pattern=r"^[0-9]{5}$")

class CashRegisterResponse(BaseSchema):
    id: UUID
    branch_id: UUID
    name: str
    pos_terminal_number: str
    is_active: bool

class SessionOpenRequest(BaseModel):
    cash_register_id: UUID
    initial_cash_amount: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    notes: Optional[str] = None

class SessionCloseRequest(BaseModel):
    actual_cash_amount: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    notes: Optional[str] = None

class CashSessionResponse(BaseSchema):
    id: UUID
    branch_id: UUID
    cash_sales: Decimal = Decimal("0.00")
    card_sales: Decimal = Decimal("0.00")
    sinpe_sales: Decimal = Decimal("0.00")
    total_sales: Decimal = Decimal("0.00")
    cash_inflows: Decimal = Decimal("0.00")
    cash_outflows: Decimal = Decimal("0.00")
    cash_register_id: UUID
    opened_by_user_id: UUID
    closed_by_user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    initial_cash_amount: Decimal
    actual_cash_amount: Optional[Decimal] = None
    expected_cash_amount: Optional[Decimal] = None
    cash_difference: Optional[Decimal] = None
    status: str
    notes: Optional[str] = None

class CashMovementCreate(BaseModel):
    movement_type: Literal["INFLOW", "OUTFLOW"]
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    reason: str = Field(min_length=3, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=2000)

class CashMovementResponse(CashMovementCreate, BaseSchema):
    id: UUID
    cash_session_id: UUID
    user_id: UUID
    created_at: datetime
