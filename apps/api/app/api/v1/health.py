import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings
from app.schemas.common import StandardResponse

logger = logging.getLogger("health_check")
router = APIRouter(tags=["Health"])

@router.get("/health", response_model=StandardResponse[Dict[str, Any]])
async def health_check():
    """Basic service health check."""
    return StandardResponse(
        data={
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
        }
    )

@router.get("/health/live", response_model=StandardResponse[Dict[str, Any]])
async def liveness_probe():
    """Liveness probe: returns 200 if the process is responsive."""
    return StandardResponse(data={"status": "live", "uptime": "ok"})

@router.get("/health/ready", response_model=StandardResponse[Dict[str, Any]])
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """
    Production readiness probe. Verifies:
    1. PostgreSQL connectivity
    2. Applied database migrations (alembic_version)
    3. Outbox table access
    4. Critical security configuration
    5. Redis availability (if configured)
    
    Ensures zero leak of internal database details or error stacktraces on failure.
    """
    checks = {}
    try:
        # 1. PostgreSQL connection check
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"

        # 2. Migration version check
        try:
            ver_res = await db.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
            version_num = ver_res.scalar_one_or_none()
            checks["migrations"] = "applied" if version_num else "uninitialized"
        except Exception:
            # Fallback if alembic_version table doesn't exist yet (development/first boot)
            checks["migrations"] = "unverified"

        # 3. Outbox table accessibility check
        try:
            await db.execute(text("SELECT 1 FROM hacienda_outbox LIMIT 1"))
            checks["outbox"] = "ready"
        except Exception:
            checks["outbox"] = "table_missing"

        # 4. Critical configuration validation
        try:
            settings.validate_production_readiness()
            checks["configuration"] = "valid"
        except Exception as conf_err:
            logger.error(f"Error en validación de configuración durante readiness: {conf_err}")
            checks["configuration"] = "invalid"
            raise ValueError("Fallo en configuración crítica")

        # 5. Optional Redis check
        if getattr(settings, "REDIS_URL", None):
            try:
                import redis.asyncio as aioredis
                r = aioredis.from_url(settings.REDIS_URL)
                await r.ping()
                await r.aclose()
                checks["redis"] = "connected"
            except Exception as r_err:
                logger.warning(f"Aviso de conectividad Redis: {r_err}")
                checks["redis"] = "unavailable"

        return StandardResponse(
            data={
                "status": "ready",
                "checks": checks,
                "environment": settings.ENVIRONMENT,
            }
        )
    except Exception as e:
        logger.error(f"Readiness probe falló: {e}")
        # Publicly return generic message without exposing internal details
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio no disponible o en proceso de inicialización"
        )
