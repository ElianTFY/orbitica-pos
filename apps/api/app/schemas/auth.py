from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import BaseSchema

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    totp_code: Optional[str] = Field(default=None, max_length=10)

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
    totp_enabled: bool = False
    email_verified: bool = False
    organization_id: Optional[UUID] = None
    organization_name: Optional[str] = None
    accessible_branches: List[UUID] = []
    permissions: List[str] = []

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None

class PasswordRecoveryRequest(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8)

class EmailVerificationRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)

class PublicEmailVerificationRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

class StepUpAuthRequest(BaseModel):
    password: str = Field(min_length=6)
    action: str = Field(min_length=3)
    target_resource: str = Field(min_length=1)
    totp_code: Optional[str] = None
    reason: Optional[str] = None

class StepUpAuthResponse(BaseModel):
    step_up_token: str
    expires_in: int
    action: str
    target_resource: str
