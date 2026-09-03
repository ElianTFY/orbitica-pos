from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationOnboardingResponse,
    OrganizationOnboardingUpdate
)
from app.schemas.common import StandardResponse
from app.services.organization_service import OrganizationService
from app.security.deps import CurrentUserContext, require_permissions, get_current_user_context
from app.core.exceptions import ConflictException

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/register", response_model=StandardResponse[OrganizationResponse], status_code=status.HTTP_201_CREATED)
async def register_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db)
):
    service = OrganizationService(db)
    org = await service.register_organization(payload)
    data = OrganizationResponse.model_validate(org)
    if hasattr(org, "access_token"):
        data.access_token = org.access_token

    return StandardResponse(
        data=data,
        message="Empresa y usuario propietario registrados exitosamente"
    )

@router.post("", response_model=StandardResponse[OrganizationResponse], status_code=status.HTTP_201_CREATED)
async def create_additional_organization(
    payload: OrganizationUpdate,
    context: CurrentUserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db)
):
    """Allows an existing verified owner to provision an additional isolated organization without creating duplicate users."""
    service = OrganizationService(db)
    org = await service.create_additional_organization_for_user(
        user=context.user,
        trade_name=payload.trade_name or "Nueva Empresa",
        legal_name=payload.legal_name,
        identification_type=payload.identification_type,
        identification_number=payload.identification_number,
        email=payload.email,
        phone=payload.phone,
        currency=payload.default_currency or "CRC"
    )
    return StandardResponse(
        data=OrganizationResponse.model_validate(org),
        message="Nueva empresa creada exitosamente"
    )

@router.get("/me", response_model=StandardResponse[OrganizationResponse])
async def get_my_organization(
    context: CurrentUserContext = Depends(require_permissions("org:read"))
):
    return StandardResponse(
        data=OrganizationResponse.model_validate(context.organization)
    )

@router.put("/me", response_model=StandardResponse[OrganizationResponse])
async def update_my_organization(
    payload: OrganizationUpdate,
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db)
):
    org = context.organization
    if payload.identification_number and payload.identification_number.strip():
        clean_id = payload.identification_number.strip()
        if clean_id != org.identification_number:
            stmt = select(type(org)).where(type(org).identification_number == clean_id, type(org).id != org.id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                raise ConflictException("Ya existe una empresa registrada con ese número de identificación")
            org.identification_number = clean_id

    for field, val in payload.model_dump(exclude_unset=True).items():
        if field != "identification_number" and hasattr(org, field) and val is not None:
            setattr(org, field, val)

    await db.commit()
    await db.refresh(org)
    return StandardResponse(
        data=OrganizationResponse.model_validate(org),
        message="Datos de la empresa actualizados exitosamente"
    )

@router.get("/onboarding", response_model=StandardResponse[OrganizationOnboardingResponse])
async def get_onboarding_status(
    context: CurrentUserContext = Depends(require_permissions("org:read")),
    db: AsyncSession = Depends(get_db)
):
    service = OrganizationService(db)
    record = await service.get_onboarding(context.organization_id)
    return StandardResponse(
        data=OrganizationOnboardingResponse.model_validate(record)
    )

@router.put("/onboarding", response_model=StandardResponse[OrganizationOnboardingResponse])
async def update_onboarding_status(
    payload: OrganizationOnboardingUpdate,
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db)
):
    service = OrganizationService(db)
    record = await service.update_onboarding(
        context.organization_id,
        payload.model_dump(exclude_unset=True)
    )
    return StandardResponse(
        data=OrganizationOnboardingResponse.model_validate(record),
        message="Progreso de configuración guardado correctamente"
    )
