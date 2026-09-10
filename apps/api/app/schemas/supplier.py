from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from app.schemas.common import BaseSchema

class SupplierCreate(BaseModel):
    identification_type: str = Field(default="02", max_length=20)  # 01=Fisica, 02=Juridica, 03=DIMEX, 04=NITE
    identification_number: str = Field(min_length=9, max_length=30)
    name: str = Field(min_length=2, max_length=255)
    trade_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None

class SupplierUpdate(BaseModel):
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    name: Optional[str] = None
    trade_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    identification_type: str
    identification_number: str
    name: str
    trade_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
