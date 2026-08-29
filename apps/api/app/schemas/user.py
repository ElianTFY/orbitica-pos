from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=3, max_length=255)
    phone: Optional[str] = None
    role: str = Field(default="cashier")
    branch_ids: List[UUID] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    branch_ids: Optional[List[UUID]] = None

class UserResponse(BaseSchema):
    id: UUID
    organization_id: Optional[UUID] = None
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
