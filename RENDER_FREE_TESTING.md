# Pruebas de Orbítica POS en Render Free

Usar la rama `codex/final-production-fixes` y el archivo `render.free.yaml`.
El `render.yaml` principal contiene infraestructura de pago; no aplicarlo para
esta prueba. Todos los recursos de `render.free.yaml` indican `plan: free`.

## Preparación

1. Elegir un workspace **Hobby** con cupo para una base gratuita. Render permite
   una PostgreSQL gratuita activa por workspace; si el cupo pertenece a otro
   proyecto, crear un workspace Hobby separado para el POS. No borrar ni
   reutilizar las tablas o credenciales de otro proyecto.
2. Configurar un remitente verificado y una clave API en Brevo. Completar
   `BREVO_API_KEY` y `EMAIL_FROM_ADDRESS` exclusivamente en Render. El correo
   viaja por HTTPS, ya que Free bloquea los puertos SMTP habituales. El adaptador
   admite códigos de registro, recuperación, 2FA y adjuntos XML.
3. Crear un Blueprint desde el repositorio y seleccionar la rama indicada y
   **Blueprint Path: `render.free.yaml`**. Revisar que los tres recursos sean
   gratuitos antes de aplicar. No añadir discos, cron ni workers de pago.
4. Confirmar las URLs que Render asignó. Si añadió sufijos a los nombres,
   corregir `FRONTEND_URL` y `BACKEND_CORS_ORIGINS` en la API, y
   `FASTAPI_BACKEND_URL` en la web. Reconstruir la web tras cambiar el destino:
   Next.js guarda los rewrites durante el build.

La API valida sus secretos y PostgreSQL, aplica las migraciones y solo después
abre el puerto HTTP. Mantiene las comprobaciones de seguridad de producción
aunque el uso sea de pruebas. No permite activar emisión real mediante este
comando de arranque. Las claves se generan una vez y no se rotan al desplegar.

## Verificación

Comprobar desde la URL de la web:

- `/login`: página disponible.
- `/health/ready`: estado `ready`, base conectada y migraciones actuales.
- `/api/v1/auth/me` sin sesión: respuesta 401.
- Registro: recibir y verificar el código verdadero; un rechazo del proveedor
  debe mostrarse como error, sin afirmar que se envió el correo.
- Crear una empresa vacía y probar productos, inventario, caja, ventas,
  cotizaciones, compras y soporte con datos de prueba.

## Qué cubre el alojamiento gratuito

PostgreSQL conserva los datos entre reinicios de la API, pero la base gratuita
vence a los 30 días. Exportar los datos que se necesiten antes del vencimiento.
Los archivos subidos a `/tmp` son temporales y se pierden al reiniciar o
redesplegar; no usar allí documentos o imágenes que deban conservarse. Para
probar persistencia de adjuntos, configurar el almacenamiento S3/R2 existente.

Los servicios se suspenden tras 15 minutos sin tráfico. Las horas gratuitas
se comparten dentro del workspace. No se añaden pings artificiales para
mantenerlos activos ni se presenta esta instalación como disponibilidad 24/7.

Este Blueprint **no ejecuta el worker fiscal**, porque Render no ofrece ese
servicio gratuitamente. La prueba web puede crear y firmar comprobantes de
Sandbox con credenciales válidas; los envíos encolados permanecerán pendientes
hasta ejecutar el worker en un entorno autorizado que comparta la base y las
claves. El proceso ya existe en `app.workers.hacienda_outbox_worker`; las pruebas
de transmisión, reintentos y entrega fiscal necesitan comprobarlo en ejecución.

Mantener `HACIENDA_LIVE_EMISSION_ENABLED=false` y la empresa en `STAGING`.
Una venta guardada o una cola creada no equivale a una factura aceptada.
Antes de contratar el alojamiento definitivo, revisar la evidencia pendiente
en `PILOT_GO_LIVE_RUNBOOK.md`; este despliegue gratuito no acredita por sí solo
que el sistema esté listo al 100% para emitir facturas reales.

Fuentes:
- https://render.com/docs/free
- https://render.com/docs/team-members
- https://developers.brevo.com/reference/send-transac-email
