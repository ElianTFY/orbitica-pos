from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, field_validator
from app.schemas.common import BaseSchema

class CustomerCreate(BaseModel):
    identification_type: str = Field(default="FISICA")
    identification_number: str = Field(min_length=9, max_length=30)
    name: str = Field(min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("identification_type")
    @classmethod
    def normalize_identification_type(cls, value: str) -> str:
        mapping = {"FISICA": "01", "JURIDICA": "02", "DIMEX": "03", "NITE": "04", "EXTRANJERO": "05"}
        normalized = mapping.get(value.strip().upper(), value.strip())
        if normalized not in {"01", "02", "03", "04", "05"}:
            raise ValueError("Tipo de identificación no válido")
        return normalized

class CustomerUpdate(BaseModel):
    identification_type: Optional[str] = None
    identification_number: Optional[str] = Field(default=None, min_length=9, max_length=30)
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("identification_type")
    @classmethod
    def normalize_identification_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return CustomerCreate.normalize_identification_type(value)

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
