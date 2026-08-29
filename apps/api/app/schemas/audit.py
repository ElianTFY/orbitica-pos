from uuid import UUID
from datetime import datetime
from typing import Optional, Any, Dict
from app.schemas.common import BaseSchema

class AuditLogResponse(BaseSchema):
    id: UUID
    organization_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    actor_id: Optional[UUID] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    payload_before: Optional[Dict[str, Any]] = None
    payload_after: Optional[Dict[str, Any]] = None
    created_at: datetime
