# Piloto para la primera empresa en un solo servidor

La web, API, PostgreSQL y worker se ejecutan como procesos separados dentro de
una misma máquina Linux. `compose.pilot.yml` no contrata servicios de Render ni
crea una máquina en otro proveedor. El coste depende del servidor elegido; una
instancia elegible de Oracle Always Free puede servir dentro de sus cuotas y
sujeta a disponibilidad. No se garantiza que la cuenta obtenga esa capacidad.

La configuración necesita un servidor Linux con Docker Engine y Compose v2,
un dominio que apunte a su IP pública y acceso entrante a TCP 80/443. La base de
datos y los puertos de la aplicación permanecen dentro de la red de Docker.

## Instalación inicial

En el servidor, desde una copia de la rama `codex/final-production-fixes`:

```sh
python3 scripts/init_pilot_env.py --domain pos.example.com
```

Sustituir `pos.example.com` por el hostname real del piloto. El comando genera
claves privadas en `.env.pilot`, con permisos 0600, y rechaza sobrescribir un
archivo existente. Completar allí el SMTP y los datos reales del proveedor de
software. Si una contraseña SMTP contiene espacios o `$`, escribir su valor
entre comillas simples en el archivo. No pegar ese archivo en GitHub ni en un
reporte público.

```sh
docker compose --env-file .env.pilot -f compose.pilot.yml config --quiet
docker compose --env-file .env.pilot -f compose.pilot.yml build api web
docker compose --env-file .env.pilot -f compose.pilot.yml up -d --wait --wait-timeout 180
```

PostgreSQL debe estar disponible antes de ejecutar las migraciones. La API
arranca después de que estas terminen correctamente; el worker y la web esperan
que la API responda a su comprobación de salud. Caddy solicita el certificado
HTTPS cuando el DNS y los puertos permiten validarlo.

Verificar `https://DOMINIO/health/ready`, el registro/login, la venta y soporte.
El navegador usa `/api/v1` del mismo dominio. El destino interno de la API se
establece al compilar Next.js, además de configurarse al arrancar el contenedor.

## Datos y mantenimiento

Los volúmenes conservan PostgreSQL, archivos subidos y certificados TLS al
recrear contenedores. No ejecutar `docker compose down --volumes` sobre esta
instalación: elimina los datos persistentes.

Guardar fuera de la máquina una copia privada de `.env.pilot`, un respaldo
consistente de PostgreSQL y los archivos subidos. Probar su restauración en una
máquina/base separada antes del uso fiscal real. Un volumen local no sustituye
un respaldo externo; las instancias gratuitas pueden recuperarse o suspenderse.

Para actualizar, verificar un respaldo restaurable, programar una ventana de
mantenimiento, detener API y worker, compilar el código elegido y aplicar las
migraciones antes de reiniciar los servicios. API y worker comparten la misma
imagen para evitar versiones fiscales distintas.

## Alcance fiscal

La empresa del primer cliente se registra con sus datos reales. Las pruebas se
realizan en Sandbox; `compose.pilot.yml` mantiene ambas banderas de emisión real
en `false`. Cambiar una bandera no acredita aceptación por Hacienda: conservar
las respuestas originales y completar `PILOT_GO_LIVE_RUNBOOK.md` antes de
habilitar comprobantes de producción.

Referencias:
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://docs.docker.com/compose/how-tos/startup-order/
- https://nextjs.org/docs/app/guides/self-hosting
- https://caddyserver.com/docs/automatic-https
