from uuid import UUID
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import BaseSchema

class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    name: str
    description: Optional[str] = None
    is_active: bool

class TaxRateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code_cr: str = Field(default="01", max_length=10)  # 01=IVA
    rate: Decimal = Field(default=Decimal("13.00"), ge=0, le=100)
    is_default: bool = False

class TaxRateResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    name: str
    code_cr: str
    rate: Decimal
    is_default: bool
    is_active: bool

class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    category_id: Optional[UUID] = None
    tax_rate_id: UUID
    sku: Optional[str] = None
    barcode: Optional[str] = None
    cabys_code: str = Field(default="5211010000100", min_length=13, max_length=13)
    unit_of_measure: str = Field(default="Unid", max_length=10)
    description: Optional[str] = None
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    sale_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    min_stock_alert: Decimal = Field(default=Decimal("5.00"), ge=0)
    image_url: Optional[str] = None
    is_service: bool = False
    initial_stock: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    branch_id: Optional[UUID] = None

    @field_validator("cabys_code")
    def validate_cabys(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned.isdigit() or len(cleaned) != 13:
            raise ValueError("El código CAByS debe tener exactamente 13 dígitos numéricos oficiales.")
        if cleaned == "0000000000000":
            raise ValueError("El código CAByS '0000000000000' es inválido en Hacienda v4.4.")
        return cleaned

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[UUID] = None
    tax_rate_id: Optional[UUID] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    cabys_code: Optional[str] = None
    unit_of_measure: Optional[str] = None
    description: Optional[str] = None
    cost_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    min_stock_alert: Optional[Decimal] = None
    image_url: Optional[str] = None
    is_service: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("cabys_code")
    def validate_cabys(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned.isdigit() or len(cleaned) != 13:
            raise ValueError("El código CAByS debe tener exactamente 13 dígitos numéricos oficiales.")
        if cleaned == "0000000000000":
            raise ValueError("El código CAByS '0000000000000' es inválido en Hacienda v4.4.")
        return cleaned

class ProductResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    tax_rate_id: UUID
    tax_rate: Optional[Decimal] = None
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    cabys_code: str
    unit_of_measure: str
    description: Optional[str] = None
    cost_price: Decimal
    sale_price: Decimal
    min_stock_alert: Decimal
    image_url: Optional[str] = None
    is_service: bool
    is_active: bool
    current_stock: Optional[Decimal] = None
