from fastapi import APIRouter
from app.api.v1 import auth, organizations, branches, users, superadmin, health

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(organizations.router)
api_v1_router.include_router(branches.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(superadmin.router)
