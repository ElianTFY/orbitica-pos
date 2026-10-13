from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class BranchCreate(BaseModel):
    code: str = Field(pattern=r"^[0-9]{3}$", default="001")
    name: str = Field(min_length=2, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = None
    is_main: bool = False

class BranchUpdate(BaseModel):
    code: Optional[str] = Field(default=None, pattern=r"^[0-9]{3}$")
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class BranchResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    code: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_main: bool
    is_active: bool
