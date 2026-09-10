# Orbítica POS — ejecución del piloto

Esta guía acompaña `codex/final-production-fixes`. Seguirla sobre una copia respaldada del sistema. No usar reportes antiguos como autorización para emitir facturas reales.

## 1. Fijar el código y validar

Tomar el commit final del PR, revisar CI y desplegar exactamente ese SHA en los tres procesos. No mezclar frontend nuevo con API vieja.

```bash
# Desde apps/api, con Python 3.12 y entorno virtual activo
pip install -r requirements-test.txt
pip check
python scripts/download_official_xsds.py --verify-only
pytest -m "not postgres_integration" -q
# En una PostgreSQL exclusiva de pruebas:
alembic upgrade head
alembic check
pytest -m postgres_integration -q
```

Desde `apps/web`: `npm ci`, `npm run typecheck`, `npm run build`. La API de producción instala `requirements.txt`; `requirements-test.txt` añade solo el verificador independiente de pruebas.

## 2. Preparar infraestructura

Se requieren PostgreSQL, API FastAPI y worker permanente. Vercel solo para Next.js. En Render o Railway usar raíz `apps/api`; revisar el servicio real existente antes de cambiar destinos.

- API: ejecutar `alembic upgrade head` como paso de despliegue y arrancar `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Worker: `python -m app.workers.hacienda_outbox_worker`. API y worker comparten base, secreto de cifrado y configuración fiscal/SMTP.
- Frontend: `NEXT_PUBLIC_API_URL` debe apuntar a la API correcta incluyendo `/api/v1`, o usar el proxy existente con `FASTAPI_BACKEND_URL`. Elegir una configuración coherente con cookies y CORS.
- Configurar `ENVIRONMENT=production`, `DATABASE_URL` con `postgresql+asyncpg://`, `SYNC_DATABASE_URL` con PostgreSQL, `JWT_SECRET_KEY`, `ENCRYPTION_MASTER_KEY`, `FRONTEND_URL`, `COOKIE_SECURE=true` y orígenes HTTPS explícitos. Si frontend/API son sitios distintos, probar las cookies de refresco con `SameSite=None; Secure`; preferir un proxy del mismo sitio cuando sea posible.
- Configurar SMTP real (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`, remitente) y datos auténticos `SOFTWARE_PROVIDER_TAX_ID`, `SOFTWARE_PROVIDER_TAX_ID_TYPE`, `SOFTWARE_PROVIDER_NAME`.
- Redis, si está configurado, debe responder. `/health/ready` debe dar 200 con migración actual; esto no certifica disponibilidad de Hacienda ni del worker.
- Confirmar almacenamiento durable/R2 para archivos y una restauración de backup en base separada.

Antes de migrar una base existente, revisar emails duplicados al normalizarlos y eventos duplicados de outbox por `invoice_id`. La migración se detiene si hay duplicados fiscales; conciliarlos conservando historia. Los productos con CAByS ficticio se desactivan. Las credenciales antiguas se pueden descifrar, pero una rotación del secreto requiere re-cifrado controlado.

## 3. Validar la empresa en Sandbox

Mantener `HACIENDA_LIVE_EMISSION_ENABLED=false` y ambiente de empresa `STAGING`. Cargar desde Configuración el certificado `.p12/.pfx`, PIN y usuario/contraseña API de pruebas de esa empresa. No subirlos al repositorio, informes ni chat.

Completar nombre legal, identificación, actividad, provincia/cantón/distrito, dirección y correo. Registrar productos con CAByS oficial y abrir caja. Ejecutar:

| Prueba | Evidencia requerida |
| --- | --- |
| Tiquete y factura con receptor | Clave única, XML firmado y respuesta original con estado aceptado |
| Pago mixto, descuento y vuelto | Total del POS = total XML = suma de pagos menos vuelto |
| Reintento del mismo cobro | Una venta, un movimiento de inventario y mismo comprobante |
| Devolución total de factura aceptada | Nota de crédito referida al original y aceptada |
| Correo fiscal | Recepción en buzón con XML firmado y respuesta de Hacienda |
| Corte del worker/API | Recuperación sin duplicar ventas ni claves; pendientes visibles |
| Soporte | Ticket y conversación visibles para empresa y Hub; notas internas ocultas al comercio |
| Delegación | Solo empresa autorizada; expiración/revocación efectiva; solo lectura bloquea cambios |

Guardar fecha, SHA desplegado, clave, estado y hash de XML en evidencia privada de la empresa. No basta un HTTP 201 de recepción ni un botón “probar conexión”. No borrar ventas para repetir pruebas. Si una venta ya quedó guardada y falló el paso fiscal, continuar desde su comprobante pendiente.

## 4. Activar un piloto controlado

Después de aceptación real en Sandbox y revisión de evidencias, configurar credenciales de producción, cambiar empresa a `PRODUCTION`, marcar `HACIENDA_SANDBOX_VALIDATED=true` y habilitar `HACIENDA_LIVE_EMISSION_ENABLED=true` en API/worker. Registrar quién habilitó, cuándo y qué evidencia revisó.

Empezar con una empresa/sucursal/caja y un turno supervisado. Vigilar borradores sin encolar, rechazos, cola, correos fallidos y diferencias de caja. La aceptación proviene exclusivamente de Hacienda.

Ante errores: detener nuevos envíos con `HACIENDA_LIVE_EMISSION_ENABLED=false`; mantener las consultas de documentos ya recibidos y conservar base/XML/claves. Corregir hacia adelante o usar nota de crédito según estado; nunca eliminar historia fiscal ni regenerar claves a ciegas.
