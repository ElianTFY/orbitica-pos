from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema

class InvoiceResponse(BaseSchema):
    id: UUID
    organization_id: UUID
    branch_id: UUID
    sale_id: Optional[UUID] = None
    doc_type: str
    numeric_key: str
    consecutive_number: str
    environment: str
    currency: str
    subtotal_amount: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    status: str
    receiver_name: Optional[str] = None
    receiver_email: Optional[str] = None
    hacienda_status_code: Optional[str] = None
    hacienda_error_message: Optional[str] = None
    created_at: datetime
    sent_to_hacienda_at: Optional[datetime] = None
    hacienda_processed_at: Optional[datetime] = None
    email_sent_at: Optional[datetime] = None
    email_retry_count: int = 0
    email_delivery_error: Optional[str] = None
    has_xml_generated: bool = False
    has_xml_signed: bool = False

class InvoiceDetailResponse(InvoiceResponse):
    xml_generated: Optional[str] = None
    xml_signed: Optional[str] = None
    hacienda_response_xml: Optional[str] = None

class InvoiceStatusUpdate(BaseModel):
    status: str  # ACCEPTED, REJECTED, PENDING
    hacienda_response_code: Optional[str] = None
    hacienda_response_detail: Optional[str] = None
