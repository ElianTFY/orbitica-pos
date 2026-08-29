# Guía de Despliegue en Producción

## Frontend (Vercel)
1. Conectar el repositorio de GitHub con Vercel.
2. Root Directory: `apps/web`.
3. Variables de entorno requeridas:
   - `NEXT_PUBLIC_API_URL`: URL del backend en Render (e.g. `https://api.orbitica.cr/api/v1`).

## Backend (Render / VPS)
1. Crear Web Service en Render con Dockerfile (`apps/api/Dockerfile`).
2. PostgreSQL Administrado configurado con SSL.
3. Variables de entorno requeridas:
   - `DATABASE_URL`: `postgresql+asyncpg://...`
   - `SYNC_DATABASE_URL`: `postgresql://...`
   - `JWT_SECRET_KEY`: Llave criptográfica de alta entropía (mínimo 64 caracteres).
   - `ENVIRONMENT`: `production`
   - `BACKEND_CORS_ORIGINS`: `["https://app.orbitica.cr"]`
