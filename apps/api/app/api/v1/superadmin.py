from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.organization import OrganizationResponse
from app.schemas.common import StandardResponse
from app.services.superadmin_service import SuperadminService
from app.security.deps import require_superadmin, CurrentUserContext
from app.core.config import settings
from app.schemas.audit import AuditLogResponse
from app.security.tokens import verify_step_up_token
from app.core.exceptions import ForbiddenException

router = APIRouter(prefix="/superadmin", tags=["Superadmin"])

@router.get("/organizations", response_model=StandardResponse[List[OrganizationResponse]])
async def list_all_tenants(
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    service = SuperadminService(db)
    orgs = await service.list_all_organizations()
    return StandardResponse(
        data=[OrganizationResponse.model_validate(o) for o in orgs]
    )

@router.get("/organizations/overview", response_model=StandardResponse[List[Dict[str, Any]]])
async def list_tenant_overviews(
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return StandardResponse(data=await SuperadminService(db).list_organization_overviews())

@router.patch("/organizations/{org_id}/status", response_model=StandardResponse[OrganizationResponse])
async def update_tenant_status(
    org_id: UUID,
    is_active: bool,
    reason: str = Query(..., min_length=10, max_length=500),
    step_up_token: str = Header(..., alias="X-Step-Up-Token"),
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    action = "Suspensión / Reactivación de Organización"
    resource = f"Tenant #{org_id}"
    if not verify_step_up_token(
        step_up_token,
        expected_user_id=str(context.user_id),
        expected_action=action,
        expected_resource=resource,
    ):
        raise ForbiddenException("Token Step-Up inválido o expirado para esta organización")
    service = SuperadminService(db)
    org = await service.toggle_organization_status(
        org_id,
        is_active,
        actor_id=context.user_id,
        reason=reason,
        step_up_token=step_up_token,
    )
    return StandardResponse(
        data=OrganizationResponse.model_validate(org),
        message=f"Estado de la organización actualizado a: {'Activo' if is_active else 'Suspendido'}"
    )

@router.get("/stats", response_model=StandardResponse[Dict[str, Any]])
async def get_platform_metrics(
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    service = SuperadminService(db)
    stats = await service.get_platform_stats()
    return StandardResponse(data=stats)

@router.get("/environment", response_model=StandardResponse[Dict[str, Any]])
async def get_environment_metadata(
    context: CurrentUserContext = Depends(require_superadmin),
):
    environment = settings.ENVIRONMENT.upper()
    return StandardResponse(data={
        "environment": environment if environment in {"PRODUCTION", "STAGING", "DEVELOPMENT"} else "DEVELOPMENT",
        "region": "Costa Rica",
        "version": settings.VERSION,
        "build_date": settings.BUILD_DATE,
        "status": "HEALTHY",
        "uptime_pct": None,
    })

@router.get("/audit", response_model=StandardResponse[List[AuditLogResponse]])
async def list_platform_audit(
    limit: int = Query(100, ge=1, le=500),
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    rows = await SuperadminService(db).list_platform_audit(limit=limit)
    return StandardResponse(data=[AuditLogResponse.model_validate(row) for row in rows])

@router.get("/search", response_model=StandardResponse[Dict[str, Any]])
async def search_platform_entities(
    q: str = Query(..., min_length=1),
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    service = SuperadminService(db)
    results = await service.search_platform(q)
    return StandardResponse(data=results)
