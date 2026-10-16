from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.branch import BranchCreate, BranchResponse, BranchUpdate
from app.schemas.common import StandardResponse
from app.services.branch_service import BranchService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/branches", tags=["Branches"])

@router.get("", response_model=StandardResponse[List[BranchResponse]])
async def list_branches(
    context: CurrentUserContext = Depends(require_permissions("branch:read")),
    db: AsyncSession = Depends(get_db)
):
    service = BranchService(db, context.organization_id)
    branches = await service.list_branches()
    return StandardResponse(
        data=[BranchResponse.model_validate(b) for b in branches if b.id in context.accessible_branch_ids]
    )

@router.post("", response_model=StandardResponse[BranchResponse], status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    context: CurrentUserContext = Depends(require_permissions("branch:create")),
    db: AsyncSession = Depends(get_db)
):
    service = BranchService(db, context.organization_id)
    branch = await service.create_branch(payload)
    return StandardResponse(
        data=BranchResponse.model_validate(branch),
        message="Sucursal creada exitosamente"
    )

@router.get("/{branch_id}", response_model=StandardResponse[BranchResponse])
async def get_branch(
    branch_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("branch:read")),
    db: AsyncSession = Depends(get_db)
):
    service = BranchService(db, context.organization_id)
    branch = await service.get_branch(branch_id)
    return StandardResponse(data=BranchResponse.model_validate(branch))

@router.put("/{branch_id}", response_model=StandardResponse[BranchResponse])
async def update_branch(branch_id: UUID, payload: BranchUpdate,
                        context: CurrentUserContext = Depends(require_permissions("branch:update")),
                        db: AsyncSession = Depends(get_db)):
    branch = await BranchService(db, context.organization_id).update_branch(branch_id, payload, context.user_id)
    return StandardResponse(data=BranchResponse.model_validate(branch), message="Sucursal actualizada")

@router.delete("/{branch_id}", response_model=StandardResponse[BranchResponse])
async def deactivate_branch(branch_id: UUID,
                            context: CurrentUserContext = Depends(require_permissions("branch:delete")),
                            db: AsyncSession = Depends(get_db)):
    branch = await BranchService(db, context.organization_id).update_branch(branch_id, BranchUpdate(is_active=False), context.user_id)
    return StandardResponse(data=BranchResponse.model_validate(branch), message="Sucursal desactivada; historial conservado")
