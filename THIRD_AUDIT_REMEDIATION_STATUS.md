# Matriz de Remediación Técnica — Auditoría de Producción ORBÍTICA POS

> [!WARNING]
> **ESTADO DEL DOCUMENTO: SUPERADO E INVALIDADO PREVENTIVAMENTE**
> Las versiones previas que declararon 19 o 20 controles resueltos fueron invalidadas en la revisión técnica profunda.
> El estado real y honesto de partida para la remediación final ejecutable contiene los 22 controles oficiales intactos:
> - **2 Corregidos**
> - **9 Parciales**
> - **10 Abiertos**
> - **1 Bloqueado por Integración Externa**

**Rama de Trabajo Activa:** `fix/final-production-readiness`  
**Commit de Partida:** `b728d7ce8a8a205fd490584aa08c5af7a9291050`  

---

## 1. Resumen de Estados por Severidad (22 Controles Oficiales)

| Severidad | Total | Corregido | Parcial | Abierto | Bloqueado Ext. |
|---|---|---|---|---|---|
| **🔴 Críticos (CR-01 a CR-06)** | 6 | 1 | 2 | 3 | 0 |
| **🟠 Altos (AL-01 a AL-10)** | 10 | 1 | 4 | 4 | 1 |
| **🟡 Medios (ME-01 a ME-06)** | 6 | 0 | 3 | 3 | 0 |
| **TOTAL** | **22** | **2** | **9** | **10** | **1** |

---

## 2. Matriz Oficial de los 22 Controles

| ID | Severidad | Descripción del Hallazgo | Estado Real | Bloqueadores Técnicos Confirmados |
|---|---|---|---|---|
| **CR-01** | **CRÍTICO** | Rutas mock en Next.js interceptaban `/api/v1/auth` con cookies inseguras. | `FIXED` | Rutas mock eliminadas en Next.js; auth centralizada en FastAPI. |
| **CR-02** | **CRÍTICO** | `store-context.tsx` utilizaba `localStorage` como base de datos empresarial de productos, ventas y caja. | `OPEN` | Pantallas de UI aún leen y escriben en `localStorage` en lugar de consumir API REST. |
| **CR-03** | **CRÍTICO** | Hub Superadmin y soporte operaban con estado local en cliente y fixtures ficticios. | `OPEN` | Hub contiene servicios con 99.99% uptime ficticio, IPs fijas y tickets quemados en código. |
| **CR-04** | **CRÍTICO** | Facturación electrónica usaba rutas simuladas que marcaban `ACCEPTED` y mencionaban v4.3. | `OPEN` | Ruta `send_to_hacienda_simulated` activa; XSDs en repo son versiones simplificadas (8.8 KB). |
| **CR-05** | **CRÍTICO** | `role` como string libre permitía escalamiento vertical a `superadmin`. | `FIXED` | Matriz `ASSIGNABLE_ROLES` en servidor restringe estrictamente asignación de roles. |
| **CR-06** | **CRÍTICO** | Aislamiento multi-tenant e IDOR en sucursales, inventario, ventas, compras y soporte. | `PARTIAL` | Modelos tienen `organization_id`, pero faltan dependencias centrales obligatorias y validación de sucursal. |
| **AL-01** | **ALTO** | Consecutivos calculados con `COUNT + 1` generando colisiones concurrentes. | `PARTIAL` | Existe `consecutive_sequences`, pero falta secuencia transaccional para compras y manejo de carrera inicial con upsert. |
| **AL-02** | **ALTO** | Falta de transaccionalidad atómica y bloqueo en ventas concurrentes de inventario. | `PARTIAL` | `SELECT ... FOR UPDATE` añadido en backend, pero requiere validación en PostgreSQL 16 con concurrencia real. |
| **AL-03** | **ALTO** | Auditoría permite modificaciones o eliminaciones sin trigger append-only en base de datos. | `OPEN` | Falta trigger PostgreSQL que rechace `UPDATE` y `DELETE` sobre `audit_logs` y regla para rol de app. |
| **AL-04** | **ALTO** | `next.config.js` apuntaba a `localhost:8000` estático en producción Vercel. | `PARTIAL` | Configuración dinámica agregada, pero fallan variables de entorno en runtime Docker. |
| **AL-05** | **ALTO** | MFA Superadmin se autoactiva en primer login sin verificar y códigos de recuperación. | `OPEN` | Primer login genera secreto y marca `totp_enabled=True` sin verificar primer código con challenge. |
| **AL-06** | **ALTO** | Secretos de desarrollo e infraestructura Docker abortan en producción. | `OPEN` | Dockerfile usa Python 3.13; docker-compose tiene contraseñas fijas y faltan variables requeridas. |
| **AL-07** | **ALTO** | Migraciones Alembic no verificadas contra PostgreSQL 16 limpio. | `PARTIAL` | Migración inicial existe, pero debe ser ejecutada y probada contra PostgreSQL 16 real. |
| **AL-08** | **ALTO** | Scripts E2E simulaban almacenamiento en memoria; CI fuera de `.github/workflows`. | `OPEN` | Workflow debe residir exclusivamente en `.github/workflows/ci.yml` y ejecutar suite Playwright completa. |
| **AL-09** | **ALTO** | Dependencias Python sin fijar (`requirements.txt` con `>=`) y lockfile de npm. | `PARTIAL` | `npm audit` limpio, pero dependencias Python requieren constraints/lock y `pip check` verificado. |
| **AL-10** | **ALTO** | Compras y stock intake sin persistencia relacional completa. | `PARTIAL` | Modelos `Purchase` y `PurchaseItem` creados en backend; falta integración con frontend y secuencias. |
| **ME-01** | **MEDIO** | Falta de rate limiting centralizado y cabeceras de seguridad. | `PARTIAL` | Cabeceras añadidas en middleware; falta rate limiter coordinado por IP/cuenta. |
| **ME-02** | **MEDIO** | Manejo de excepciones expone detalles internos en endpoints públicos. | `PARTIAL` | Handlers creados; healthcheck no debe filtrar detalles de infraestructura pública. |
| **ME-03** | **MEDIO** | Normalización de variables de entorno y Pydantic Settings. | `PARTIAL` | Variables alineadas parcialmente; falta validación estricta `${VARIABLE:?required}` en Compose. |
| **ME-04** | **MEDIO** | Generador XML v4.4 utiliza CAByS fijos o inventados (`5211010000100`). | `OPEN` | Se requiere catálogo oficial completo v4.4, mapeo exacto de impuestos y golden files. |
| **ME-05** | **MEDIO** | Firma digital XAdES-EPES sin digest verificado independientemente con xmlsec1. | `OPEN` | Se requiere política oficial verificada con SHA-256 exacto y pruebas negativas con herramienta externa. |
| **ME-06** | **MEDIO** | Reclamaciones de UI falsas ("IndexedDB Offline Sync operativo", uptime 100%, etc.). | `OPEN` | Eliminar afirmaciones engañosas en dashboard, soporte, tickets y Hub Superadmin. |
| **EXT-01** | **EXTERNO**| Envío en vivo a Sandbox ATV de Hacienda Costa Rica. | `BLOCKED_EXTERNAL` | Requiere llave criptográfica `.p12`, PIN y credenciales ATV Staging proporcionadas por el cliente piloto. |

---

## 3. Criterio de Transición a FIXED_VERIFIED

Ningún control será marcado como `FIXED_VERIFIED` sin cumplir acumulativamente:
1. Código fuente real implementado y conectado en backend y frontend.
2. Migración y persistencia real en PostgreSQL 16 (cero SQLite para pruebas de concurrencia o aislamiento).
3. Prueba automatizada negativa y de integración ejecutada con éxito.
4. Cero mocks, cero fallbacks ficticios y cero afirmaciones simuladas.
