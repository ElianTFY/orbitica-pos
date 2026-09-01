from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings
from app.schemas.common import StandardResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=StandardResponse[dict])
async def health_check():
    return StandardResponse(
        data={
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
        }
    )

@router.get("/health/live", response_model=StandardResponse[dict])
async def liveness_probe():
    """Kubernetes / Render liveness probe."""
    return StandardResponse(data={"status": "live", "uptime": "ok"})

@router.get("/health/ready", response_model=StandardResponse[dict])
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """Readiness probe checking database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        return StandardResponse(
            data={
                "status": "ready",
                "database": "connected",
                "environment": settings.ENVIRONMENT,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database readiness check failed: {str(e)}"
        )
