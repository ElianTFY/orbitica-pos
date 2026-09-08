# Orbítica POS — referencia de despliegue

La versión anterior de este documento queda sustituida por [DEPLOY.md](DEPLOY.md) y [PILOT_GO_LIVE_RUNBOOK.md](PILOT_GO_LIVE_RUNBOOK.md).

La documentación anterior afirmaba un despliegue en Railway, backups continuos y migraciones retrocompatibles sin evidencia del alojamiento real. También indicaba una URL de API de ejemplo y un healthcheck incorrecto. Esas afirmaciones no deben utilizarse para publicar ni migrar la empresa.

Usar los nombres de variables de `apps/api/app/core/config.py`. Para el proveedor fiscal son `SOFTWARE_PROVIDER_TAX_ID_TYPE`, `SOFTWARE_PROVIDER_TAX_ID` y `SOFTWARE_PROVIDER_NAME`; los antiguos ejemplos `HACIENDA_PROVIDER_TAX_ID` y `HACIENDA_SYSTEM_*` no configuran esos campos.

La comprobación de disponibilidad es `GET /health/ready`. Frontend, API y worker deben ejecutar el mismo código validado. El envío real a Hacienda permanece desactivado hasta completar las evidencias externas del piloto.
