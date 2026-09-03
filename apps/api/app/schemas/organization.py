from uuid import UUID
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema

class OrganizationCreate(BaseModel):
    # Owner Information (Account credentials)
    owner_full_name: str = Field(min_length=3, max_length=255)
    owner_email: EmailStr
    owner_password: str = Field(min_length=8)
    owner_phone: Optional[str] = None
    enable_2fa: bool = False
    registration_token: Optional[str] = None

    # Business Information (Starts BLANK unless explicitly entered)
    trade_name: Optional[str] = Field(default="", max_length=255)
    legal_name: Optional[str] = Field(default="", max_length=255)
    identification_type: Optional[str] = Field(default="02")
    identification_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country_code: str = Field(default="CR", max_length=2)
    default_currency: str = Field(default="CRC", max_length=3)
    initial_branch_name: str = Field(default="Sucursal Principal", max_length=255)
    initial_branch_address: Optional[str] = None

class OrganizationUpdate(BaseModel):
    trade_name: Optional[str] = None
    legal_name: Optional[str] = None
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    default_currency: Optional[str] = None
    economic_activity_code: Optional[str] = None
    province_code: Optional[str] = None
    canton_code: Optional[str] = None
    district_code: Optional[str] = None
    neighborhood_code: Optional[str] = None
    address_detail: Optional[str] = None
    tax_regime: Optional[str] = None
    atv_environment: Optional[str] = None

class OrganizationResponse(BaseSchema):
    id: UUID
    legal_name: str
    trade_name: str
    identification_type: str
    identification_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: str
    default_currency: str
    is_active: bool
    access_token: Optional[str] = None

class OrganizationOnboardingResponse(BaseSchema):
    organization_id: UUID
    current_step: int
    is_completed: bool
    business_data_completed: bool
    fiscal_data_completed: bool
    branches_completed: bool
    payments_completed: bool
    products_completed: bool
    contacts_completed: bool
    users_completed: bool

class OrganizationOnboardingUpdate(BaseModel):
    current_step: Optional[int] = None
    is_completed: Optional[bool] = None
    business_data_completed: Optional[bool] = None
    fiscal_data_completed: Optional[bool] = None
    branches_completed: Optional[bool] = None
    payments_completed: Optional[bool] = None
    products_completed: Optional[bool] = None
    contacts_completed: Optional[bool] = None
    users_completed: Optional[bool] = None
