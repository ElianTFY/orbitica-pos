# ORBÍTICA POS — revisión verificable del 14 de octubre de 2026

Rama `fix/verified-pos-hacienda-20261011`, basada en `codex/final-production-fixes` (`84288cc`). Revisión en [PR #2](https://github.com/ElianTFY/orbitica-pos/pull/2). No se ha activado emisión productiva ni transmitido comprobantes a Hacienda durante esta revisión. **Piloto fiscal y producción todavía no aprobados.**

Este documento describe lo implementado y probado, sin atribuir aceptación fiscal a pruebas locales. Los checks del PR identifican el SHA exacto y el resultado de cada ejecución remota. Los informes anteriores no sustituyen esta evidencia.

**Actualización del despliegue: 15 de octubre de 2026, Costa Rica.** API y web de Render publicadas en `58218bb3c292921cf122363c4a1b80afd203a95d`; PostgreSQL nuevo conectado y migraciones hasta `0007` aplicadas. Acceso: [ORBÍTICA POS de pruebas](https://orbitica-pos-test-web.onrender.com/login). Esto no acredita registro con correo real, un recorrido autenticado en este despliegue ni aceptación de Hacienda.

## Matriz de correcciones y evidencia

Rutas de backend relativas a `apps/api`; rutas de frontend relativas a `apps/web`.

| Prioridad / módulo | Problema e impacto | Cambio / archivo principal | Evidencia |
|---|---|---|---|
| P0 — Registro | Era posible omitir verificación del correo; la sesión no sobrevivía a recargar | Token de registro obligatorio, validado por correo/vigencia; refresh solo en cookie HttpOnly. `services/organization_service.py`, `api/v1/organizations.py` | Registro válido y 4 casos negativos; navegador desde empresa vacía y recarga |
| P0 — Sesiones | Logout/restablecimiento dejaban vigente el access token | Access vinculado a familia persistida; validación y revocación efectivas en servidor. `services/auth_service.py`, `security/deps.py` | `test_session_revocation.py`; navegador rechaza token anterior después del cambio de clave |
| P1 — Recuperación | Enlace inexistente y formulario enviado a endpoint incorrecto | `/reset-password`, token en fragmento, limpieza de URL y formulario real. `app/(auth)/forgot-password/page.tsx` | Recuperación completa desde navegador con correo capturado de prueba, nueva contraseña y login |
| P0 — Caja | Arqueo sumaba el vuelto como ingreso; riesgos de doble apertura/turno ajeno | Pagos netos, bloqueos, índices únicos, permisos; movimientos auditados. `services/cash_register_service.py`, migración `0006` | `test_verified_operations.py`; concurrencia PostgreSQL en CI |
| P0 — Venta e inventario | Venta sin evento fiscal; duplicados por timeout/concurrencia | Venta, pagos, inventario, comprobante y outbox en una transacción; idempotencia del servidor y navegador. `services/sale_service.py` | Pruebas de idempotencia/concurrencia; venta de última unidad en PostgreSQL |
| P0 — Devoluciones | Un reembolso podía alterar el arqueo ya cerrado | Movimiento único referenciado en la caja actual; bloqueo ante transmisión incierta | Prueba de devolución entre turnos; navegador devuelve stock y cierra con diferencia cero |
| P0 — Perfil fiscal | Actividad/ubicación/proveedor inventados por defecto; instantánea incompleta | Nuevas empresas empiezan sin actividad/ubicación; venta exige perfil completo antes de reservar número; XML sin sustituciones ficticias. `services/fiscal_profile.py`, `hacienda_xml_generator_v44.py`, migración `0007` | 4 casos de XML incompleto, empresa vacía, venta rechazada sin venta/outbox/movimiento |
| P0 — Certificado | Archivo o PIN inválidos provocaban fallo tardío; se guardaban certificados vencidos | Comprobar apertura, clave privada y ventana de vigencia antes de guardar; error 400 sin detalle criptográfico sensible. `services/fiscal_security_service.py` | 4 pruebas HTTP: vencido, futuro, PIN incorrecto y sin clave privada |
| P0 — Datos fiscales históricos | Editar la empresa cambiaba un documento pendiente o reimpreso | Instantánea inmutable de emisor/receptor/sucursal y XML persistido | `test_final_fiscal_flow.py`; cambio de razón social posterior no altera documento |
| P0 — Worker | Respuesta perdida podía causar reenvío o devolución insegura | Lease/bloqueos, consulta por clave original, marca durable previa a POST y espera progresiva. `workers/hacienda_outbox_worker.py` | Pruebas de respuesta perdida/reinicio; 4 workers en PostgreSQL, API de Hacienda simulada y señalada como tal |
| P0 — Emisión productiva | Bandera global podía habilitar otras empresas | Guard exige evidencia FE/TE/NC aceptada de STAGING de la misma empresa, además de flags globales | Prueba de aislamiento. No existe evidencia real de aceptación del piloto todavía |
| P1 — Sucursales y stock | Stock cero por falta de selección; propietario no veía sucursal nueva; selección ajena ignorada | Selección predeterminada autorizada, rechazo 403 a selección inválida; alta de stock exige sucursal autorizada. `security/deps.py`, `api/v1/products.py` | Aislamiento entre empresas; navegador crea sucursal y producto con stock persistido |
| P1 — Empleados | Operaciones locales y jerarquía insuficiente | CRUD real, roles, contraseña y restricciones sobre propietario. `api/v1/users.py`, `features/store/store-context.tsx` | API y navegador: crear cajero, recargar, iniciar sesión y acceder al POS |
| P1 — Estado del navegador | Datos de una sesión podían sobrevivir al cambio de identidad; operaciones antes de cargar | Estado por usuario/empresa, descarte de respuestas antiguas y espera inicial | Navegador registro/recarga/cambio de sesión; sin errores JS no controlados |
| P1 — Recibo | Claves regeneradas, QR decorativo, vuelto ausente y hora UTC sin indicar | Clave/consecutivo persistidos, QR real, vuelto, hora CR y aviso de STAGING; impresión del navegador sin prometer ESC/POS. `components/pos/thermal-receipt.tsx` | E2E decodifica la imagen QR y la compara con la clave; vuelto de 870; XML pendiente responde 409 |
| P1 — Reportes | Utilidad estimada por porcentaje, costos limitados a top 10, IVA y vuelto incluidos indebidamente | Reporte del servidor, todos los costos, margen sin IVA, pagos netos; CSV con mismo filtro y clave original. `services/report_service.py`, `app/(owner)/reports/page.tsx` | 11 productos, pagos mixtos, devolución y CSV protegido contra fórmulas; navegador muestra utilidad 300 y descarga CSV de la venta |
| P1 — Dependencias | CI detectó vulnerabilidades productivas | Lockfile actualizado; Next 15.5.27 y dependencias transitivas corregidas | `npm audit --omit=dev`: 0 vulnerabilidades el 14 de octubre; no equivale a auditar dependencias de desarrollo |

## Pruebas ejecutadas y límites

- Backend local: **139 aprobadas, 6 excluidas por marcador PostgreSQL y 6 advertencias de deprecación**, 21,25 s. Salida en `audit-evidence/2026-10-14/backend-tests.txt`.
- Frontend: typecheck y build correctos, 39 páginas generadas. Salidas guardadas en el mismo directorio. Auditoría npm de dependencias productivas: 0 vulnerabilidades.
- Navegador local: **10 pasos aprobados**, API real y SQLite desechable; empresa vacía, producto/CAByS/stock, empleado, sucursal, caja/venta/recibo, reporte/CSV, devolución/cierre, catálogo tablet/móvil, cajero y recuperación. `browser-local.json` identifica fecha y alcance. El correo se captura en memoria de pruebas; Hacienda no se contacta.
- CI anterior sobre `f5f7a51`: PostgreSQL 16, 6 pruebas de integración/concurrencia, migración nueva, sin drift y restauración a otra base aprobados. ARM construyó y arrancó API/web/worker/PostgreSQL y comprobó proxy y proceso worker. Run `38432145016`. Su frontend falló por dependencias; se corrigieron posteriormente.
- CI del código `459420677f6d3edf76493a5f9f0598717557ac7b`: [run 38650652202](https://github.com/ElianTFY/orbitica-pos/actions/runs/38650652202) aprobado en sus 4 jobs. Backend: 139 pruebas; PostgreSQL 16: 6 pruebas, migraciones sin drift, respaldo/restauración y 10 pasos de navegador contra una base separada; frontend: typecheck/build y auditoría productiva sin vulnerabilidades; ARM: API/web/worker/PostgreSQL y proxy. [Artefacto de navegador](https://github.com/ElianTFY/orbitica-pos/actions/runs/38650652202/artifacts/11934687468), SHA256 `df8d7c09ad10a6a1f4684902ffdd1f13bc75674e3105c1ae204f0d635643baec`. Los cambios posteriores de este informe y del Blueprint gratuito no modifican ese código de aplicación; consultar los checks para cada SHA posterior.
- XSD/firma: certificados autofirmados exclusivos de pruebas, validación XSD y verificación criptográfica. Esto no acredita confianza del certificado, aceptación externa ni conformidad de todos los campos condicionales.
- Fallos intermedios resueltos: validación fiscal reveló fixtures incompletos (se completaron explícitamente, conservando las aserciones de aislamiento); una invocación desde la raíz falló por la ruta relativa de Alembic (ejecución correcta desde `apps/api`). No se desactivaron permisos ni se introdujeron bypass de autenticación.

## Alcance pendiente por módulo

| Módulo | Estado y trabajo restante |
|---|---|
| Hacienda real | **Bloqueado externo:** faltan credenciales válidas y aceptación auténtica FE, TE y NC referenciada en sandbox. No hay evidencia de producción. |
| Perfil fiscal existente | La migración no borra ni cambia valores históricos. El operador debe confirmar actividad y ubicación que pudieron haberse asignado por defecto antes de esta versión. La validación de formato no acredita pertenencia al catálogo ni correspondencia entre certificado y cédula. |
| Otros comprobantes | Hay generadores y pruebas parciales; no hay recorridos completos verificados de ND, MR, FEC, FEE o REP. No se implementaron devoluciones parciales. |
| Moneda / exoneraciones | Flujo validado en CRC. USD con tipo de cambio por operación y exoneraciones no completos. |
| Gastos, órdenes de trabajo, despachos, fidelización y banca | Siguen conteniendo estado local en pantallas visibles. **No aptos para guardar datos operativos todavía.** Requieren modelo, endpoints, permisos y persistencia; no se han ocultado ni declarado terminados. |
| Suscripción | No se ha verificado cobro por proveedor. Las transiciones locales no acreditan pago. |
| Productos, clientes, compras, proveedores e inventario | Persistencia/API existentes y suites previas aprobadas; falta cubrir edición de todos los campos, adjuntos y todas las acciones desde navegador. |
| Cotizaciones | Creación/conversión existentes y pruebas previas; falta revisar edición y todos los estados/acciones desde navegador. |
| Reportes | Resumen de ventas actualmente vigentes, no libro contable histórico por fecha de reembolso ni declaración fiscal. Pendientes exportaciones y conciliación completa de impuestos/caja/períodos. |
| Soporte / superadmin | Suites de permisos, aislamiento, acceso delegado y tickets aprobadas. No equivale a revisión visual de cada acción del Hub. |
| Impresión / PDF | Recibo HTML y QR verificados; falta comprobar papel/impresora física y entrega/representación PDF completa. |
| Correo / archivos | Entrega real y persistencia de R2/S3 tras reinicio desplegado pendientes. El correo con reintentos puede duplicarse si el proveedor acepta y se pierde la respuesta. |
| Interfaz | Catálogo verificado a 390 y 768 px; flujo principal en escritorio. No se ha certificado cada pantalla, teclado/lector o dispositivo. |
| Operación | Worker arrancado en CI, no en el despliegue del cliente. Pendientes monitoreo, respaldo/restauración operativos, reinicios y recuperación de infraestructura real. |

## Compatibilidad, configuración y reversión

1. Respaldar base y archivos; comprobar restauración antes de migrar el entorno del piloto. Mantener emisión productiva desactivada.
2. Aplicar `alembic upgrade head` hasta `0007_explicit_fiscal_profile`. `0006` se detiene ante turnos abiertos duplicados, sin borrarlos. `0007` retira defaults y amplía barrio a 50 caracteres; conserva valores e historial existentes. Su downgrade no trunca direcciones ni repone datos fiscales ficticios.
3. Publicar **API y worker del mismo SHA**, después el frontend. Comprobar `/health/ready`, migración y proceso worker por separado.
4. Los JWT antiguos sin familia de sesión se rechazan: los usuarios deben volver a iniciar sesión una vez. No alternar una API nueva con otra antigua emitiendo tokens incompatibles.
5. Ante incidente, detener nuevas operaciones y pausar el worker; conservar outbox/XML/respuestas. Volver coordinadamente a una versión de aplicación compatible con el esquema y restaurar una copia solo tras conciliar ventas posteriores al respaldo. No reiniciar consecutivos ni retransmitir claves a ciegas.

| Servicio | Configuración necesaria, sin secretos |
|---|---|
| Vercel | `FASTAPI_BACKEND_URL` de la API real, también en Preview; Root Directory `apps/web` |
| API y worker | Mismo `DATABASE_URL`, `SYNC_DATABASE_URL`, `JWT_SECRET_KEY`, `ENCRYPTION_MASTER_KEY`; conservar clave de cifrado para leer credenciales anteriores |
| Sesiones / proxy | `FRONTEND_URL`, orígenes HTTPS explícitos en `BACKEND_CORS_ORIGINS`, cookies seguras y dominio/SameSite según el despliegue |
| Fiscal | Identidad real del proveedor mediante `SOFTWARE_PROVIDER_TAX_ID`, `SOFTWARE_PROVIDER_NAME`; empresa en STAGING con certificado/PIN/usuario/contraseña cargados mediante configuración protegida |
| Correo | SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`) o Brevo configurado; comprobar entrega externa |
| Archivos | `STORAGE_TYPE=S3`, bucket y endpoint R2/S3, credenciales de acceso configuradas en el servidor; alternativamente volumen durable compartido donde corresponda |
| Worker | Proceso `python -m app.workers.hacienda_outbox_worker`, mismo código/secretos/base; observar cola, reintentos y correos fallidos |

## Acceso de prueba y bloqueadores externos

La versión actual de pruebas está en **https://orbitica-pos-test-web.onrender.com/login**. La base es nueva: se debe usar **Registrar Negocio**, verificar el correo en la propia aplicación y completar el perfil fiscal antes de vender. La entrega real de correo y el recorrido autenticado sobre este despliegue todavía requieren validación; las 10 pruebas de navegador anteriores corresponden al entorno CI separado.

En **Orbítica POS Pruebas** (`tea-dagp5uon74is739f9bsg`), los dos servicios usan `fix/verified-pos-hacienda-20261011` y tienen publicado `58218bb3c292921cf122363c4a1b80afd203a95d`, cuyo código de aplicación es idéntico al `4594206` validado en CI:

| Servicio | Despliegue comprobado | Estado |
|---|---|---|
| API | `dep-db8lqufavr4c7388m610`, publicado el 15 de octubre a las 17:12 CR | `live`; PostgreSQL conectado; migraciones `0001`–`0007` ejecutadas |
| Web | `dep-db86bcjncjis73eqb400`, publicado el 14 de octubre a las 23:35 CR | `live`; proxy `/api/v1` y `/health` conectado a la API |

La comprobación pública del 15 de octubre a las 17:12 CR devolvió **200** en `/health/ready` tanto directamente en la API como a través de la web: `database=connected`, `migrations=current`, `outbox=ready`, `configuration=valid`. `/login` y `/register` devolvieron 200; `/api/v1/products` sin sesión devolvió 401, como corresponde. La etiqueta de entorno `production` activa controles de seguridad del servidor; **no significa emisión fiscal productiva**. `outbox=ready` comprueba la tabla, no un worker en ejecución. Evidencia sin secretos en `audit-evidence/2026-10-15/`: `public-http.json`, `render-migrations.txt` y captura de acceso.

`DATABASE_URL` quedó conectado a la nueva base mediante la URL interna de Render; no se habilitó acceso externo. API conserva cookies seguras y CORS para la web de pruebas; `HACIENDA_LIVE_EMISSION_ENABLED=false` y `HACIENDA_SANDBOX_VALIDATED=false`. El primer intento del 15 de octubre a las 17:06 CR falló porque el formulario de Render conservó el valor anterior mientras cargaba el campo protegido. Se corrigió y verificó el valor persistido antes del despliegue exitoso; no fue necesario cambiar el código de aplicación.

Los despliegues automáticos de API y web permanecen desactivados: las publicaciones se controlan manualmente para mantener versiones coordinadas. El intento de cambiar a «After CI Checks Pass» no se guardó antes de cerrarse la sesión del panel; no se atribuye ese ajuste como completado. Los servicios gratuitos se suspenden por inactividad y al abrir pueden mostrar la pantalla de arranque de Render.

La repetición tras varias horas sin uso, el 15 de octubre a las 22:08 CR, mostró ese límite: login/registro respondieron 200, pero la API agotó inicialmente 55 segundos y el proxy devolvió 429. Los logs confirmaron un arranque normal, sin migraciones pendientes. A las **22:10 CR**, `/health/ready` volvió a responder **200 en API y web** con los cuatro controles válidos. Se conservan ambos resultados en `public-http-after-idle.json` y `public-readiness-after-wake.json`; el primer acceso al plan gratuito no tiene disponibilidad inmediata garantizada.

La base anterior `orbitica-pos-test-db` venció el 9 de octubre y está suspendida. El 14 de octubre el propietario confirmó que solo contenía pruebas sin información importante. No se contrató su recuperación ni se borró manualmente.

Se creó **`orbitica-pos-test-db-20261014`** (`dpg-db80lf1srm7s73893um0-a`), PostgreSQL 16, Ohio, **plan free**, sin autoscaling, réplicas ni HA, con acceso externo restringido (`ipAllowList: []`). Vence el **13 de noviembre de 2026 a las 17:05, hora de Costa Rica**. Está conectada a la API y migrada. No se contrataron servicios de pago.

`render.free.yaml` apunta a esa base y a la rama revisada. El Blueprint preparado no se ha aplicado: se actualizaron los servicios existentes mediante el conector y el panel de Render. El entorno gratuito **no incluye worker permanente ni almacenamiento durable de archivos**. Una venta puede quedar en cola; este despliegue no demuestra envío ni aceptación fiscal.

Vercel mantiene pendiente su conexión a la API. La última comprobación de su preview `https://web-3f0i6ouue-eliantfys-projects.vercel.app` dio 200 en `/login` y 404 `DNS_HOSTNAME_RESOLVED_PRIVATE` en `/health/ready` por falta de `FASTAPI_BACKEND_URL`. No se presenta ese preview ni la URL antigua de Vercel como acceso funcional actual.

| Responsable | Bloqueador / acción concreta |
|---|---|
| Operador + técnico | Probar registro con correo real y el flujo autenticado en la URL de Render; confirmar entrega del código, recarga, venta y persistencia. La conectividad, migraciones y proxy ya están comprobados |
| Técnico | Conectar Vercel a la API cuando esta esté saludable. Para el piloto fiscal: resolver worker, correo y archivos durables; cualquier infraestructura de pago requiere autorización separada |
| Empresa piloto | Completar perfil fiscal real y credenciales **de sandbox** mediante configuración segura; no enviarlas a un PR ni pegarlas en chat |
| Técnico + operador | FE, TE y NC referenciada reales en sandbox; conservar privadamente fecha, SHA, clave, estado y respuesta original. No inventar evidencia ni usar una respuesta simulada |
| Técnico | Completar módulos y comprobaciones todavía pendientes en la tabla anterior |
| Propietario | Autorizar por separado cualquier gasto y la emisión productiva con operaciones legítimas, después de aprobar el piloto |

Para reproducir el recorrido de desarrollo: instalar dependencias, construir `apps/web` y ejecutar `E2E_ALLOW_DISPOSABLE_DB=1 node scripts/verify-pos-browser.cjs` desde esa carpeta, con Chromium de Playwright y Python del backend disponibles. El script crea datos sintéticos desechables y no sirve como acceso compartido de producción.

Fuentes fiscales consultadas: [API oficial](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html), [actualización de anexos 4.4](https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf). HTTP 201 acredita recepción, no aceptación. El segundo documento menciona noviembre del «presente año» sin año explícito en el texto consultado; no se infirió una fecha absoluta. Falta completar el contraste de catálogos/condicionales vigentes antes del dictamen fiscal.

**Dictamen:** recorrido principal demostrado en entorno de prueba y correcciones en revisión. Piloto fiscal bloqueado por integración y aceptación externa; producción bloqueada además por los módulos y verificaciones pendientes.
