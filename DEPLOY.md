# Despliegue de Orbítica POS

La guía operativa vigente es [PILOT_GO_LIVE_RUNBOOK.md](PILOT_GO_LIVE_RUNBOOK.md).
Subir o integrar una rama en GitHub no acredita que los servicios estén desplegados.

Para **pruebas gratuitas en Render**, usar [RENDER_FREE_TESTING.md](RENDER_FREE_TESTING.md)
y el archivo `render.free.yaml`. Esta opción mantiene la emisión real bloqueada,
incluye correo por HTTPS y detalla las pruebas que requieren un worker aparte.
El archivo `render.yaml` principal sigue siendo la alternativa de pago.

Para la primera empresa con presupuesto mínimo, usar la alternativa de
[un solo servidor](PILOT_SINGLE_SERVER.md). Mantiene web, API, PostgreSQL y worker
en una misma máquina; no requiere contratar los servicios separados del
Blueprint de Render.

1. Identificar el proyecto Vercel, el alojamiento real de la API/worker, la rama conectada y la base existente. Registrar los SHA actuales y verificar un respaldo restaurable antes de migrar.
2. Desplegar API y worker desde el mismo commit validado, con raíz `apps/api` y PostgreSQL. Ejecutar `alembic upgrade head` como paso de despliegue antes de iniciar los procesos. API: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; worker permanente: `python -m app.workers.hacienda_outbox_worker`.
3. Configurar en ambos procesos `ENVIRONMENT=production`, `DATABASE_URL`, `SYNC_DATABASE_URL`, `JWT_SECRET_KEY`, `ENCRYPTION_MASTER_KEY`, `FRONTEND_URL`, `BACKEND_CORS_ORIGINS` y `COOKIE_SECURE=true`. Conservar el secreto maestro existente para poder descifrar las credenciales guardadas. Los valores concretos se gestionan en el alojamiento, nunca en GitHub.
4. Mantener `HACIENDA_LIVE_EMISSION_ENABLED=false` y `HACIENDA_SANDBOX_VALIDATED=false` durante la validación inicial. Configurar SMTP y los datos auténticos `SOFTWARE_PROVIDER_TAX_ID_TYPE`, `SOFTWARE_PROVIDER_TAX_ID` y `SOFTWARE_PROVIDER_NAME` según la guía del piloto.
5. Comprobar `GET /health/ready` directamente en la API: debe devolver 200 y la revisión actual. Verificar por separado que el worker permanece activo. Un 200 del frontend no verifica la API.
6. En Vercel usar raíz `apps/web`. Para el proxy del mismo origen, configurar `FASTAPI_BACKEND_URL` con la URL HTTPS pública real de la API, sin `/api/v1` y sin barra final; `NEXT_PUBLIC_API_URL=/api/v1`. Con este proxy, usar `COOKIE_SAMESITE=lax` y dejar `COOKIE_DOMAIN` sin definir. Las variables se aplican mediante un nuevo build.
7. Publicar el frontend del mismo commit solo después de verificar la API y el worker. Comprobar `/health/ready` a través de Vercel y probar registro/login, refresco de sesión, caja, venta y soporte. No usar direcciones localhost, privadas o de ejemplo como destino de Vercel.
8. Completar las pruebas de Hacienda en Sandbox con la empresa y conservar las respuestas originales de aceptación antes de habilitar emisión real.

Los archivos `apps/api/railway*.json` son configuraciones para Railway; su presencia no demuestra que exista un servicio allí. Confirmar el proveedor y los servicios conectados antes de cambiar destinos.

## Primera instalación en Render

`render.yaml` define recursos nuevos exclusivos del POS: API, worker permanente,
PostgreSQL 16 y un volumen para los archivos subidos. No se debe aplicar sobre una
base que contenga datos sin revisar previamente sus migraciones y respaldo.

El Blueprint usa servicios de pago y su aplicación requiere revisar el coste en
Render. Publicar este archivo en GitHub no crea recursos ni activa cargos. Los
despliegues automáticos quedan apagados para coordinar API, worker y frontend.

1. Abrir [el instalador de esta rama](https://render.com/deploy?repo=https://github.com/ElianTFY/orbitica-pos/tree/codex/final-production-fixes), revisar `render.yaml` y los planes antes de aplicar.
2. Introducir en Render el servidor, usuario y contraseña SMTP, y la identificación/nombre reales del proveedor de software. Para SMTP se preparó STARTTLS en el puerto 587; si el proveedor usa otros parámetros, ajustar el grupo `orbitica-pos-runtime`. No introducir contraseñas en GitHub.
3. Render genera las claves JWT y de cifrado una sola vez y las comparte con el worker. Conservar la clave maestra junto con el procedimiento privado de recuperación; no regenerarla al restaurar una base existente.
4. La API ejecuta `alembic upgrade head` antes de arrancar. El worker espera los trabajos de la misma base y termina su lote activo al recibir SIGTERM.
5. Copiar la URL pública HTTPS que Render asigne a la API en `FASTAPI_BACKEND_URL` de Vercel. No usar el hostname interno de Render. Reconstruir y comprobar `/health/ready`, registro, login, venta y soporte antes de promover.

El Blueprint inicial guarda los archivos subidos en el volumen persistente de la
API; los XML fiscales y acuses se conservan en PostgreSQL. Para cambiar a R2/S3,
configurar `STORAGE_TYPE=S3`, `S3_BUCKET_NAME`, `S3_ENDPOINT_URL`, `AWS_REGION=auto`
(para R2), `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`. El adaptador usa el SDK
real y propaga los errores de acceso; no simula guardados en memoria. Migrar los
archivos ya existentes antes de cambiar de backend de almacenamiento.

No se habilita facturación real con este instalador: ambas banderas de Hacienda
permanecen desactivadas hasta completar las pruebas del piloto.
