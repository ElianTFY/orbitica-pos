from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class InvoiceResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    branch_id: UUID
    sale_id: UUID
    doc_type: str
    numeric_key: str
    consecutive_number: str
    status: str
    hacienda_response_code: Optional[str] = None
    hacienda_response_detail: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    xml_generated: bool = False

class InvoiceStatusUpdate(BaseModel):
    status: str  # ACCEPTED, REJECTED, PENDING
    hacienda_response_code: Optional[str] = None
    hacienda_response_detail: Optional[str] = None
