# ORBÍTICA POS — correcciones verificables

Fecha: 13 de octubre de 2026. Rama: `fix/verified-pos-hacienda-20261011`, basada en `codex/final-production-fixes` (`84288cc`). **No habilitado para producción fiscal.** Este informe sustituye afirmaciones generales de “100 %” por evidencias y pendientes concretos.

## Problemas corregidos

| Prioridad | Módulo / problema | Implementación | Evidencia |
|---|---|---|---|
| P0 | El arqueo sumaba el efectivo recibido sin restar vuelto | Totales netos por medio de pago; ingresos/retiros persistidos y auditados | `tests/test_verified_operations.py` |
| P0 | Dos aperturas y operaciones sobre el turno ajeno | Bloqueo de registros y turnos, índices únicos parciales, comprobación de operador/sucursal | Regresiones locales; `test_verified_postgres.py` exige PostgreSQL |
| P0 | Venta guardada sin evento fiscal si se cerraba el navegador | Venta, pagos, inventario, comprobante y evento de firma pendientes en la misma transacción | Pruebas de venta/idempotencia y evento `PENDING_SIGNATURE` |
| P0 | Respuesta perdida al transmitir y devolución insegura | Consulta de la clave antes de POST, constancia durable del intento, rechazo de devolución mientras exista incertidumbre | Prueba de respuesta perdida + rollback; suite del worker |
| P0 | Recibos y XML regeneraban identidades fiscales | Descarga del XML firmado persistido; recibo usa clave/consecutivo originales; historial pide recibo al servidor | `test_final_fiscal_flow.py`, `test_hacienda_and_purchases.py` |
| P0 | Cambiar empresa/cliente podía alterar la factura pendiente | Instantánea fiscal de emisor, receptor y sucursal al registrar; utilizada para firma/reimpresión | Prueba que edita la razón social tras vender |
| P0 | Bandera global de sandbox habilitaba a otras empresas | Emisión productiva exige flags globales y FE/TE/NC de sandbox aceptados para la empresa emisora | Prueba de aislamiento de preparación fiscal |
| P0 | Gerente podía desactivar o rebajar al propietario | Control de jerarquía del usuario objetivo; accesos de sucursal validados | Pruebas de modificación del propietario y sucursal inválida |
| P1 | Empleados y sucursales solo cambiaban en React | CRUD conectado a API, desactivación conservando historial, roles y contraseña reales, errores y espera al guardar | Pruebas de API + typecheck/build; navegador pendiente de completar |
| P1 | El cajero recibía error general por endpoints fuera de su rol | Carga de datos según permisos; datos de caja reales; catálogo paginado | Typecheck/build; navegador de cajero pendiente |
| P1 | Devolver tras cerrar el turno alteraba el arqueo histórico | Reembolso en efectivo sale de la caja abierta actual mediante movimiento referenciado | Prueba de dos turnos y cierre original inalterado |
| P1 | Descuentos no comprobaban permisos efectivos | Tope de descuento bajo configurable con `POS_LOW_DISCOUNT_LIMIT` (10 por defecto) | Prueba de rechazo a descuento del 50 % por cajero |
| P1 | Reintentos simultáneos de correo / sin espera | Bloqueo de filas y espera progresiva en reenvíos de correo | Código; entrega externa pendiente |
| P1 | Vercel buscaba la app en la raíz del repositorio | Root Directory del proyecto existente cambiado a `apps/web` | Error previo `missing_pages_app`; nuevo despliegue pendiente |

## Compatibilidad y despliegue

La migración nueva es `0006_cash_fiscal_integrity`. API y worker deben actualizarse juntos, después de migrar y antes de publicar el frontend de esta rama. La migración se detiene si hay turnos abiertos duplicados; no elimina ni corrige silenciosamente historial. Los comprobantes anteriores conservan sus XML; los antiguos sin instantánea adquieren una al firmarse. Las ventas nuevas quedan encoladas automáticamente: retirar dependencias del POST de emisión desde el navegador.

La URL conocida apunta a una publicación antigua realizada por CLI; no se ha podido atribuir su SHA. Los últimos despliegues Git consultados fallaban. Vercel no mostró variables del proyecto: falta `FASTAPI_BACKEND_URL` con la URL real de la API (también en Preview). No se ha promovido una publicación fiscal productiva.

Render devolvió dos workspaces (`liaa` y `Orbítica POS Pruebas`) y exige selección confirmada por el usuario. La pregunta de selección quedó sin respuesta. No se ha inspeccionado ni modificado un servicio al azar. `render.free.yaml` no incluye worker permanente y usa almacenamiento temporal: no acredita operación fiscal durable.

## Pruebas y niveles de evidencia

- Baseline anterior: 115 pruebas backend; typecheck y build válidos.
- Regresiones añadidas: vuelto/pagos mixtos, ingresos/retiros, devolución entre turnos, permisos, sucursales, emisión por empresa, recuperación tras respuesta perdida.
- Última ejecución local previa al cierre: 122 aprobadas; 6 PostgreSQL excluidas intencionalmente. Se conservará la salida final en `audit-evidence/2026-10-13/`.
- Firma/XSD: pruebas existentes y ampliadas con certificado local de pruebas; **no es aceptación por Hacienda**.
- PostgreSQL: añadidas pruebas con transacciones separadas para última unidad, apertura simultánea y cuatro workers. CI también prepara restauración de respaldo en otra base. Hasta disponer de un run satisfactorio son pruebas preparadas, no ejecutadas.
- Navegador: recorrido en preparación contra API y base local, sin simular respuestas de ventas. La creación de datos de prueba no se realizará en producción.

## Alcance que sigue incompleto

| Módulo | Estado real / pendiente |
|---|---|
| Hacienda sandbox | Sin credenciales autorizadas ni evidencia real de aceptación FE, TE y NC. No se ha transmitido a producción. |
| Perfil y certificado fiscal | Debe completarse antes de vender; quedan por verificar correspondencia del certificado con emisor y catálogos/condicionales vigentes. Una instantánea incompleta requiere un procedimiento explícito de corrección; no se sobrescribe silenciosamente. |
| Otros comprobantes | No hay recorridos completos verificados para ND, mensaje receptor, factura de compra, exportación o REP. No hay devoluciones parciales. |
| Moneda / exoneraciones | Venta soportada en CRC; USD con tipo de cambio persistido, exoneraciones y sus reportes siguen pendientes. |
| Gastos, órdenes, despachos, fidelización y banca | Persisten implementaciones de estado local en módulos visibles; no se consideran terminadas ni aptas para datos operativos. |
| Reportes | No se han conciliado exhaustivamente agregados, pagos mixtos, reembolsos, períodos y exportaciones. |
| Cotizaciones | Creación/conversión existentes; edición y todos los estados requieren revisión adicional. |
| Suscripción | No se ha verificado proveedor de cobros real; las transiciones locales no acreditan pagos. |
| Correo y archivos | Faltan prueba externa de entrega, R2/S3 configurado y persistencia tras reinicio desplegado. El correo puede duplicarse si el proveedor acepta y se pierde su respuesta; no se promete exactamente una entrega. |
| Operación | Falta evidencia de worker en marcha, latido/monitoreo, backup/restore desplegado, límites y recuperación de infraestructura. |
| Interfaz | No se ha verificado cada pantalla/acción ni toda la matriz escritorio/tablet/móvil. |

## Fuentes fiscales comprobadas

- https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html — recepción HTTP 201 deja validación pendiente; consultas, Base64 y OIDC.
- https://www.hacienda.go.cr/docs/ActualizacionAnexosyEstructurasVersion4.4CEv2.pdf — actualización de anexos y códigos de referencia. Su texto menciona aplicación desde 1.º de noviembre del “presente año” sin año explícito en el documento consultado; no se ha inferido una fecha absoluta. Debe contrastarse el juego vigente de XSD/catálogos antes de certificar conformidad.

## Bloqueadores y acciones

1. Propietario: confirmar workspace de Render. Técnico: inspeccionar API, PostgreSQL y worker, conectar Vercel con esa API y verificar versiones.
2. Empresa piloto: aportar perfil fiscal real, certificado/PIN y credenciales **de sandbox** mediante configuración segura; no pegarlos en un informe o PR.
3. Técnico: terminar los módulos y verificaciones pendientes listados; no sustituirlos por datos demo ni ocultarlos como completados.
4. Propietario/operador: autorizar por separado cualquier contratación y, después de un piloto aprobado, la emisión real con operaciones legítimas.

Dictamen actual: **desarrollo en corrección; piloto fiscal y producción bloqueados**. Las pruebas locales no sustituyen aceptación real, entrega externa ni verificación de infraestructura.
