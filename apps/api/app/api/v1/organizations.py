from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.schemas.common import StandardResponse
from app.services.organization_service import OrganizationService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/register", response_model=StandardResponse[OrganizationResponse], status_code=status.HTTP_201_CREATED)
async def register_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db)
):
    service = OrganizationService(db)
    org = await service.register_organization(payload)
    return StandardResponse(
        data=OrganizationResponse.model_validate(org),
        message="Empresa y usuario propietario registrados exitosamente"
    )

@router.get("/me", response_model=StandardResponse[OrganizationResponse])
async def get_my_organization(
    context: CurrentUserContext = Depends(require_permissions("org:read"))
):
    return StandardResponse(
        data=OrganizationResponse.model_validate(context.organization)
    )
