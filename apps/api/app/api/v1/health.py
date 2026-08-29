from fastapi import APIRouter
from app.schemas.common import StandardResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=StandardResponse[dict])
async def health_check():
    return StandardResponse(
        data={"status": "healthy", "service": "ORBÍTICA POS API", "version": "1.0.0"}
    )
