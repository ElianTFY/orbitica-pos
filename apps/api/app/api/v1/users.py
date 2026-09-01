from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.common import StandardResponse
from app.services.user_service import UserService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=StandardResponse[List[UserResponse]])
async def list_users(
    context: CurrentUserContext = Depends(require_permissions("user:read")),
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db, context.organization_id)
    users = await service.list_users()
    return StandardResponse(
        data=[UserResponse.model_validate(u) for u in users]
    )

@router.post("", response_model=StandardResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    context: CurrentUserContext = Depends(require_permissions("user:create")),
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db, context.organization_id)
    user = await service.create_user(
        data=payload,
        creator_id=context.user_id,
        creator_role=context.role
    )
    return StandardResponse(
        data=UserResponse.model_validate(user),
        message="Usuario colaborador creado exitosamente"
    )

@router.get("/{user_id}", response_model=StandardResponse[UserResponse])
async def get_user(
    user_id: UUID,
    context: CurrentUserContext = Depends(require_permissions("user:read")),
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db, context.organization_id)
    user = await service.get_user(user_id)
    return StandardResponse(data=UserResponse.model_validate(user))

@router.put("/{user_id}", response_model=StandardResponse[UserResponse])
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    context: CurrentUserContext = Depends(require_permissions("user:update")),
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db, context.organization_id)
    user = await service.update_user(
        user_id=user_id,
        data=payload,
        actor_id=context.user_id,
        actor_role=context.role
    )
    return StandardResponse(
        data=UserResponse.model_validate(user),
        message="Usuario actualizado exitosamente"
    )
