from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from app.schemas.common import BaseSchema

class CustomerCreate(BaseModel):
    identification_type: str = Field(default="FISICA")
    identification_number: str = Field(min_length=9, max_length=30)
    name: str = Field(min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    identification_type: str
    identification_number: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
