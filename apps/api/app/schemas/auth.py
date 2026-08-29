from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UserProfileResponse(BaseSchema):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    organization_id: Optional[UUID] = None
    organization_name: Optional[str] = None
    accessible_branches: List[UUID] = []
    permissions: List[str] = []

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None
