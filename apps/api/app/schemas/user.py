from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema
from app.core.constants import UserRole

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=3, max_length=255)
    phone: Optional[str] = None
    role: UserRole = Field(default=UserRole.CASHIER)
    branch_ids: List[UUID] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    branch_ids: Optional[List[UUID]] = None

class UserResponse(BaseSchema):
    id: UUID
    organization_id: Optional[UUID] = None
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
