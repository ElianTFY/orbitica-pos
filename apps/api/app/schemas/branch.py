from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class BranchCreate(BaseModel):
    code: str = Field(min_length=1, max_length=10, default="001")
    name: str = Field(min_length=2, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = None
    is_main: bool = False

class BranchUpdate(BaseModel):
    name: Optional[str] = None
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
