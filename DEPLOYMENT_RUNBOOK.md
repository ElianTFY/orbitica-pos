# ORBÍTICA POS — Deployment & Infrastructure Runbook

## 1. Arquitectura de Despliegue en Producción

- **Frontend**: Desplegado en Vercel (Next.js 15 SSR / Edge).
- **Backend**: Desplegado en Railway / Docker Container (FastAPI + Uvicorn).
- **Base de Datos**: PostgreSQL 16 Administrado con copias de seguridad continuas y SSL activado.

---

## 2. Variables de Entorno Requeridas

### 2.1 Backend (`apps/api`)
```env
ENVIRONMENT=production
DEBUG=false
APP_NAME=Orbítica POS API
API_V1_STR=/api/v1
PORT=8000

# Base de Datos PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:password@host:5432/orbitica_db
SYNC_DATABASE_URL=postgresql+psycopg2://postgres:password@host:5432/orbitica_db

# Seguridad y Criptografía
SECRET_KEY=generate-64-character-random-hex-string-for-jwt-signing
FERNET_KEY=generate-32-byte-base64-fernet-key-for-p12-encryption
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["https://web-mocha-gamma-es6gomw437.vercel.app","https://orbitica.cr"]

# Proveedor del Sistema (Hacienda v4.4)
HACIENDA_SYSTEM_NAME=ORBITICA_POS
HACIENDA_SYSTEM_VERSION=1.0.0
HACIENDA_PROVIDER_TAX_ID=3101000000
```

### 2.2 Frontend (`apps/web`)
```env
NEXT_PUBLIC_API_URL=https://orbitica-api-production.up.railway.app
NEXT_PUBLIC_APP_NAME=Orbítica POS
```

---

## 3. Flujo de Despliegue y Migraciones de Base de Datos

### 3.1 Migración de Base de Datos (Alembic)
Antes de enrutar tráfico al nuevo backend, ejecutar la migración automatizada:
```bash
alembic upgrade head
```

### 3.2 Despliegue Zero-Downtime
1. Los cambios en el backend son retrocompatibles con el esquema de base de datos.
2. Railway ejecuta el healthcheck en `GET /api/v1/health`.
3. Una vez el backend está saludable, se despliega la nueva versión del frontend en Vercel.
