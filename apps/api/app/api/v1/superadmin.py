from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.organization import OrganizationResponse
from app.schemas.common import StandardResponse
from app.services.superadmin_service import SuperadminService
from app.security.deps import require_superadmin, CurrentUserContext

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

@router.patch("/organizations/{org_id}/status", response_model=StandardResponse[OrganizationResponse])
async def update_tenant_status(
    org_id: UUID,
    is_active: bool,
    context: CurrentUserContext = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    service = SuperadminService(db)
    org = await service.toggle_organization_status(org_id, is_active, actor_id=context.user_id)
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
