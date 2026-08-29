from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponse
from app.schemas.common import StandardResponse
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("", response_model=StandardResponse[List[AuditLogResponse]])
async def list_audit_logs(
    resource: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: CurrentUserContext = Depends(require_permissions("audit:read")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog).where(AuditLog.organization_id == context.organization_id)
    if resource:
        stmt = stmt.where(AuditLog.resource == resource)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    res = await db.execute(stmt)
    logs = list(res.scalars().all())
    return StandardResponse(data=[AuditLogResponse.model_validate(l) for l in logs])
