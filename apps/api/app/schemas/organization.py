from uuid import UUID
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema

class OrganizationCreate(BaseModel):
    legal_name: str = Field(min_length=2, max_length=255)
    trade_name: str = Field(min_length=2, max_length=255)
    identification_type: str = Field(default="JURIDICA")
    identification_number: str = Field(min_length=5, max_length=30)
    email: EmailStr
    phone: Optional[str] = None
    country_code: str = Field(default="CR", max_length=2)
    default_currency: str = Field(default="CRC", max_length=3)
    initial_branch_name: str = Field(default="Sucursal Principal", max_length=255)
    initial_branch_address: Optional[str] = None
    owner_email: EmailStr
    owner_password: str = Field(min_length=8)
    owner_full_name: str = Field(min_length=3, max_length=255)

class OrganizationUpdate(BaseModel):
    trade_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    default_currency: Optional[str] = None

class OrganizationResponse(BaseSchema):
    id: UUID
    legal_name: str
    trade_name: str
    identification_type: str
    identification_number: str
    email: str
    phone: Optional[str] = None
    country_code: str
    default_currency: str
    is_active: bool
