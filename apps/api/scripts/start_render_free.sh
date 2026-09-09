#!/usr/bin/env bash
# Render Free has no pre-deploy command. Migrate once before serving HTTP.
set -euo pipefail

python - <<'PY'
from app.core.config import settings

if settings.ENVIRONMENT != "production":
    raise RuntimeError("El piloto público debe mantener las comprobaciones de seguridad de producción.")
settings.validate_production_readiness()
if settings.HACIENDA_LIVE_EMISSION_ENABLED:
    raise RuntimeError("El despliegue gratuito de pruebas no permite emisión fiscal real.")
PY

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
