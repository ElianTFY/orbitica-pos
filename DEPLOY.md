# Despliegue de Orbítica POS

La guía operativa vigente es [PILOT_GO_LIVE_RUNBOOK.md](PILOT_GO_LIVE_RUNBOOK.md).
Subir o integrar una rama en GitHub no acredita que los servicios estén desplegados.

1. Identificar el proyecto Vercel, el alojamiento real de la API/worker, la rama conectada y la base existente. Registrar los SHA actuales y verificar un respaldo restaurable antes de migrar.
2. Desplegar API y worker desde el mismo commit validado, con raíz `apps/api` y PostgreSQL. Ejecutar `alembic upgrade head` como paso de despliegue antes de iniciar los procesos. API: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; worker permanente: `python -m app.workers.hacienda_outbox_worker`.
3. Configurar en ambos procesos `ENVIRONMENT=production`, `DATABASE_URL`, `SYNC_DATABASE_URL`, `JWT_SECRET_KEY`, `ENCRYPTION_MASTER_KEY`, `FRONTEND_URL`, `BACKEND_CORS_ORIGINS` y `COOKIE_SECURE=true`. Conservar el secreto maestro existente para poder descifrar las credenciales guardadas. Los valores concretos se gestionan en el alojamiento, nunca en GitHub.
4. Mantener `HACIENDA_LIVE_EMISSION_ENABLED=false` y `HACIENDA_SANDBOX_VALIDATED=false` durante la validación inicial. Configurar SMTP y los datos auténticos `SOFTWARE_PROVIDER_TAX_ID_TYPE`, `SOFTWARE_PROVIDER_TAX_ID` y `SOFTWARE_PROVIDER_NAME` según la guía del piloto.
5. Comprobar `GET /health/ready` directamente en la API: debe devolver 200 y la revisión actual. Verificar por separado que el worker permanece activo. Un 200 del frontend no verifica la API.
6. En Vercel usar raíz `apps/web`. Para el proxy del mismo origen, configurar `FASTAPI_BACKEND_URL` con la URL HTTPS pública real de la API, sin `/api/v1` y sin barra final; `NEXT_PUBLIC_API_URL=/api/v1`. Con este proxy, usar `COOKIE_SAMESITE=lax` y dejar `COOKIE_DOMAIN` sin definir. Las variables se aplican mediante un nuevo build.
7. Publicar el frontend del mismo commit solo después de verificar la API y el worker. Comprobar `/health/ready` a través de Vercel y probar registro/login, refresco de sesión, caja, venta y soporte. No usar direcciones localhost, privadas o de ejemplo como destino de Vercel.
8. Completar las pruebas de Hacienda en Sandbox con la empresa y conservar las respuestas originales de aceptación antes de habilitar emisión real.

Los archivos `apps/api/railway*.json` son configuraciones para Railway; su presencia no demuestra que exista un servicio allí. Confirmar el proveedor y los servicios conectados antes de cambiar destinos.
