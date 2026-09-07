# Orbítica POS — cierre de auditoría e integración

Fecha de cierre: 7 de septiembre de 2026. Rama: `codex/final-production-fixes`.

## Dictamen

**Candidato para validación del piloto; emisión fiscal real todavía NO aprobada.**
Se corrigió código ejecutable y se integraron los commits `5abe37c` y `64d17e3`, posteriores a la base inicialmente entregada (`5a4c2a2`). Esta entrega no acredita un despliegue en Vercel/Render ni aceptación real por Hacienda. Los reportes anteriores que afirmaban preparación comercial total no constituyen evidencia de ello.

## Correcciones principales

| Área | Problema comprobado | Corrección |
| --- | --- | --- |
| POS | Confirmación visual antes de persistir; IVA agregado a precios que ya lo incluían | Esperar la API, mostrar fallos, precios con IVA, descuentos por línea y pagos mixtos reales |
| Reintentos | Venta y caché de idempotencia se confirmaban en transacciones distintas | Una transacción para venta y respuesta; bloqueo por clave en PostgreSQL; misma clave en reintento del navegador |
| Vuelto | El vuelto completo se repetía en cada pago en efectivo | Distribuirlo una sola vez y excluirlo del medio de pago fiscal; rechazar sobrepago sin efectivo |
| Consecutivos | Colisión entre primera factura y primer tiquete | Número de venta incluye ambiente y consecutivo fiscal completo; contador atómico |
| XML v4.4 | Descuento duplicado en resumen, IVA cero convertido a 13, validación ausente tolerada | Resumen conciliado con snapshot; preservar cero; fallar si falta XSD; exigir referencia real en notas |
| Firma | Política v4.2 y digest incompatible con SHA-256 | Política oficial v4.4, C14N exclusiva, RSA 2048/4096 y verificación de todas las referencias |
| Entrega fiscal | Worker sin inicio separado, reintentos ambiguos, consulta y cola desincronizadas | Proceso de worker, estados durables, reconsulta sin retransmitir tras constancia de recepción, sincronización de respuesta y reintentos de correo |
| Devolución | Riesgo de devolución durante envío incierto; stock agregado a servicios | Bloquear hasta conciliar; generar NC para aceptadas; reintegrar solo inventario físico |
| Pantalla fiscal | Acuse XML fabricado y aceptación mostrada por defecto en el nuevo código | Descargar únicamente XML firmado/respuesta almacenados y mostrar estado/fechas reales |
| Soporte/Hub | Botones y métricas locales; delegación reutilizable entre agentes/empresas | Tickets, mensajes, estados, búsqueda y auditoría por API; permiso temporal ligado a un agente; límites por empresa y solo lectura |
| Acciones de administrador | Suspensión sin esperar resultado; privilegios elevados sin verificación adicional | Step-Up vinculado a acción/recurso/motivo; esperar respuesta; FULL_ADMIN delegado requiere verificación del propietario |
| Sesión | Solicitudes simultáneas podían rotar la misma cookie varias veces | Una renovación de token en vuelo por cliente; conservar nuevos desafíos MFA/registro |
| Cotizaciones | Datos locales y conversión con IVA duplicado/confirmaciones separadas | Persistencia por API, totales con IVA, conversión bajo bloqueo y una transacción; rechazar cambios de precio o vencimiento |
| Infraestructura | CI fuera de la carpeta activa, revisión de esquema insuficiente | Workflow en `.github/workflows`, servicio PostgreSQL 16, migraciones y readiness que exige HEAD |

## Evidencia reproducible

- Suite backend local: **97 pruebas aprobadas, 3 de PostgreSQL excluidas explícitamente**, corrida final del 7 de septiembre sobre el código integrado (41,63 segundos). Salida conservada en `audit-evidence/2026-09-07/backend-tests.txt`.
- Frontend: build final correcto, 38 páginas generadas y validación de tipos correcta. `npm audit` completo: cero vulnerabilidades. Salidas conservadas en `audit-evidence/2026-09-07/`.
- Firma comprobada además con **XMLSec 1.3.17**, independiente del verificador de la aplicación. Certificado de pruebas generado localmente: no prueba aceptación de Hacienda.
- Los nueve XSD locales se verificaron por SHA-256 y se compilaron correctamente.
- Se descargó la política oficial; SHA-256 hexadecimal: `0d6c629f5c5639e23c3ae5905dace1e158cb5806822c003de787a6ec3321d21f`. Su valor base64 coincide con `DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=` utilizado en la firma.
- Migración desde base SQLite vacía hasta `0005_final_production_fixes`: correcta; `alembic check`: sin operaciones nuevas. SQLite no demuestra bloqueos concurrentes de PostgreSQL.
- **GitHub Actions aprobado** para el código `c7670f0bfb6cc03408b40d67f3afac2e322d4df6`: backend (97 pruebas), PostgreSQL 16 (3 pruebas, migración y check sin drift), y frontend (instalación limpia, audit, tipos y build). **100 pruebas aprobadas en total.** Incluye veinte consecutivos concurrentes y veinte reintentos del mismo cobro con una sola venta/una salida de stock. Evidencia: `audit-evidence/2026-09-07/ci-results.json`; [ejecución verificable](https://github.com/ElianTFY/orbitica-pos/actions/runs/34074190666). PostgreSQL se ejecutó en CI, no en el entorno local.

Las pruebas de red fiscal y correo usan dobles controlados donde está indicado. Un estado `ACCEPTED` configurado por una prueba no es evidencia de aceptación externa. El build y TypeScript prueban compilación, no reemplazan una sesión manual del piloto.

## Límites de esta entrega

El piloto debe limitarse a operaciones ordinarias en CRC, precios con IVA y devoluciones totales. USD se bloquea hasta contar con un tipo de cambio persistido. Exoneraciones especiales, exportación, factura de compra, recibos de pago, crédito y escenarios tributarios particulares requieren pruebas propias antes de ofrecerlos; tener un XSD no equivale a implementar todo el flujo.

Los módulos del Hub de planes/precios, cobro de suscripciones, automatizaciones, comunicaciones e incidentes siguen pendientes y se muestran deshabilitados. Funciones auxiliares del portal como bancos, despacho, fidelización, RRHH, gastos o edición avanzada de sucursales no forman parte de la validación comercial de este piloto. No se declara eliminado todo estado local de todo el monorepo. La edición de cotizaciones todavía requiere crear una nueva; no se simula su guardado.

La protección append-only bloquea modificaciones normales en la base, pero no sustituye copias externas ni protege de un administrador de PostgreSQL con facultad de quitar triggers. La custodia fiscal usa **Fernet (AES-128-CBC y HMAC-SHA256)** con clave derivada del secreto maestro y lectura compatible con el cifrado anterior, no AES-256-GCM.

## Condiciones que faltan para habilitar emisión real

1. CI ya está verde. Ejecutar el mismo código validado en frontend, API y worker con PostgreSQL migrado; comprobar backup/restauración y almacenamiento persistente de archivos.
2. Configurar identificación real del proveedor, SMTP y credenciales propias de la empresa en Sandbox. Obtener FE, TE y NC **aceptadas por Hacienda**, conservar respuesta original y verificar recepción del correo con XML.
3. Completar una prueba manual: registro/login, caja, producto CAByS, cliente, venta mixta/descuento, reintento, factura, devolución, ticket y consulta en Hub. Habilitar producción con credenciales de ese ambiente solo al cerrar esas evidencias.

La URL pública reportada no pudo verificarse desde la herramienta de navegación; no hay confirmación del commit desplegado ni de la conexión al backend real. Subir esta rama no demuestra que la página de producción ya cambió.

## Fuentes primarias consultadas

- [Hacienda — estructuras y anexos oficiales](https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx).
- [Anexos y estructuras v4.4](https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/ANEXOS%20Y%20ESTRUCTURAS_V4.4.pdf).
- [API de comprobantes](https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html).

Consultar `PILOT_GO_LIVE_RUNBOOK.md` para ejecución. No se emitieron comprobantes reales, no se enviaron correos a clientes y no se desplegó producción durante esta auditoría.
