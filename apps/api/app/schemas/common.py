from typing import Generic, TypeVar, List, Optional, Any
from pydantic import BaseModel, ConfigDict
from uuid import UUID

T = TypeVar("T")

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class StandardResponse(BaseSchema, Generic[T]):
    success: bool = True
    data: T
    message: Optional[str] = None

class PaginatedResponse(BaseSchema, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail
