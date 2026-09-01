# Matriz de Remediación de Auditoría Técnica — ORBÍTICA POS

Esta matriz detalla los 22 hallazgos identificados en la auditoría inicial de seguridad y arquitectura, su causa técnica, la corrección aplicada, pruebas automatizadas de verificación y el estado de mitigación.

---

## 🔴 Hallazgos Críticos (CR-01 a CR-06)

| ID | Severidad | Causa Raíz | Archivos Afectados | Corrección Aplicada | Prueba de Verificación | Estado |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **CR-01** | **CRÍTICO** | Rutas mock en Next.js interceptaban `/api/v1/auth` creando cookies JSON no seguras sin validar con FastAPI. | `apps/web/app/api/v1/auth/*`, `apps/web/lib/api-client.ts` | Eliminación total de rutas mock en Next.js. Auth delegada exclusivamente a FastAPI con Argon2id, JWT corto y refresh tokens en cookie `HttpOnly`. | `test_auth.py::test_login_invalid_password`, `test_login_bypass_negative` | 🟢 Corregido |
| **CR-02** | **CRÍTICO** | `store-context.tsx` utilizaba `localStorage` para almacenar productos, ventas, inventario y cajas. | `apps/web/features/store/store-context.tsx` | Eliminación de `localStorage` para datos operativos. Persistencia en PostgreSQL mediante endpoints REST de FastAPI. | `test_pos_persistence.py`, `test_sales_db.py` | 🟡 En Progreso |
| **CR-03** | **CRÍTICO** | Superadmin y soporte operaban con estado simulado en cliente y reembolsos falsos. | `apps/web/features/superadmin/*`, `apps/web/app/api/v1/superadmin/*` | Creación de endpoints FastAPI respaldados por PostgreSQL para empresas 360°, tickets, notas internas y accesos delegados. | `test_superadmin.py`, `test_support_tickets.py` | 🟡 En Progreso |
| **CR-04** | **CRÍTICO** | Facturación electrónica usaba `simulate_success=True`, respuestas hardcodeadas y firmador sin canonicalización estándar C14N. | `apps/api/app/api/v1/hacienda.py`, `apps/api/app/services/xades_signer.py` | Eliminación de simulaciones. Implementación de XAdES-EPES v1.3.2 con `lxml`, validación contra XSD v4.4 oficial y ciclo de estados reales (`PROCESSING` en 201 -> consulta -> `ACCEPTED`). | `test_xades_and_hacienda_live.py`, `test_xsd_v44_validation.py` | 🟡 En Progreso |
| **CR-05** | **CRÍTICO** | `role` era un string libre en schemas y servicios, permitiendo a usuarios tenant crear un superadmin. | `apps/api/app/schemas/user.py`, `apps/api/app/services/user_service.py`, `constants.py` | Matriz estricta `ASSIGNABLE_ROLES` en servidor. Prohibición de escalamiento: solo `SUPERADMIN` puede asignar roles de plataforma. | `test_rbac.py::test_privilege_escalation_blocked` | 🟢 Corregido |
| **CR-06** | **CRÍTICO** | Endpoints con UUID no validaban pertenencia al `organization_id` del usuario autenticado (riesgo IDOR). | `apps/api/app/security/deps.py`, servicios de catálogo, inventario, ventas, caja | Derivación obligatoria de `organization_id` desde el contexto de sesión autenticado. Filtro compuesto en todas las consultas. | `test_tenant_isolation.py::test_idor_blocked` | 🟡 En Progreso |

---

## 🟠 Hallazgos Altos (AL-01 a AL-10)

| ID | Severidad | Causa Raíz | Archivos Afectados | Corrección Aplicada | Prueba de Verificación | Estado |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **AL-01** | **ALTO** | Consecutivos calculados con `COUNT + 1` generando colisiones concurrentes. | `apps/api/app/services/sale_service.py` | Tabla `consecutive_sequences` con clave compuesta y actualización atómica bloqueada por fila (`SELECT FOR UPDATE`). | `test_consecutive_atomicity.py` | 🟡 En Progreso |
| **AL-02** | **ALTO** | Falta de transaccionalidad atómica y bloqueo en ventas concurrentes de inventario. | `apps/api/app/services/sale_service.py`, `inventory_service.py` | Venta en una sola transacción PostgreSQL con `SELECT FOR UPDATE` en `inventory_levels` y validación de stock no negativo. | `test_inventory_concurrency.py` | 🟡 En Progreso |
| **AL-03** | **ALTO** | Auditoría en tabla ordinaria o localStorage sin encadenamiento. | `apps/api/app/models/audit_log.py`, `audit_service.py` | Registro append-only con encadenamiento criptográfico `previous_hash` + `event_hash` (SHA-256) y verificador de integridad. | `test_audit_chain.py` | 🟡 En Progreso |
| **AL-04** | **ALTO** | `next.config.js` apuntaba a `localhost:8000` estático en producción Vercel. | `apps/web/next.config.js`, `api-client.ts` | Configuración dinámica de rewrites y cliente API vía `FASTAPI_BACKEND_URL` y `NEXT_PUBLIC_API_URL`. | `test_api_client.ts` | 🟢 Corregido |
| **AL-05** | **ALTO** | Códigos de recuperación y verificación predecibles o sin límite de intentos. | `apps/api/app/services/auth_service.py` | Tokens aleatorios criptográficos (48 bytes), almacenamiento exclusivo de hashes SHA-256, expiración 15 min / 1 h y max 3 intentos. | `test_auth.py::test_password_recovery_lifecycle` | 🟢 Corregido |
| **AL-06** | **ALTO** | Secretos por defecto en `config.py` y `docker-compose.yml`. | `apps/api/app/core/config.py`, `docker-compose.yml` | `validate_production_readiness()` que aborta el arranque en producción si se usan defaults inseguros. | `test_config_validation.py` | 🟢 Corregido |
| **AL-07** | **ALTO** | Falta de migraciones Alembic versionadas en `alembic/versions`. | `apps/api/alembic/*` | Creación de baseline completo y migraciones incrementales probadas desde base vacía. | `test_migrations.py` | 🟡 En Progreso |
| **AL-08** | **ALTO** | Scripts E2E simulaban almacenamiento en memoria sin navegar por HTTP/FastAPI. | `apps/web/scripts/*` | Pruebas de integración HTTP y Playwright sobre endpoints reales de FastAPI y PostgreSQL. | `pytest tests/`, `playwright test` | 🟡 En Progreso |
| **AL-09** | **ALTO** | Vulnerabilidades reportadas por `npm audit` en baseline. | `apps/web/package.json`, `package-lock.json` | Actualización de dependencias a versiones compatibles corregidas y regeneración de lockfile. | `npm audit --audit-level=high` | 🟡 En Progreso |
| **AL-10** | **ALTO** | Compras y gastos generaban UUIDs sintéticos sin persistencia relacional. | `apps/api/app/services/purchase_service.py` | Modelado y persistencia transaccional de `purchases`, `purchase_items` con afectación real a inventario y cuentas por pagar. | `test_purchases_db.py` | 🟡 En Progreso |

---

## 🟡 Hallazgos Medios (ME-01 a ME-06)

| ID | Severidad | Causa Raíz | Archivos Afectados | Corrección Aplicada | Prueba de Verificación | Estado |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **ME-01** | **MEDIO** | Falta de cabeceras de seguridad CSP, HSTS y rate limiting en endpoints públicos. | `apps/api/app/middleware/*`, `apps/web/next.config.js` | Middlewares de `SecurityHeadersMiddleware`, HSTS, X-Content-Type-Options y rate-limiter por IP en login/registro. | `test_security_headers.py` | 🟢 Corregido |
| **ME-02** | **MEDIO** | Filtración de `str(exc)` en respuestas HTTP 500. | `apps/api/app/main.py` | Manejador global que retorna mensajes genéricos con `request_id` en producción y registra detalles en logs protegidos. | `test_error_handling.py` | 🟢 Corregido |
| **ME-03** | **MEDIO** | Inconsistencia en nombres de variables de entorno (`JWT_SECRET` vs `JWT_SECRET_KEY`). | `apps/api/app/core/config.py`, `.env.example` | Normalización de variables en Pydantic Settings con aliases y documentación unificada. | `test_config.py` | 🟢 Corregido |
| **ME-04** | **MEDIO** | Builds no reproducibles por versiones sin fijar en `requirements.txt`. | `apps/api/requirements.txt` | Lock de dependencias y fijación de versiones en Python 3.12 / 3.13. | `pip install --no-deps` | 🟢 Corregido |
| **ME-05** | **MEDIO** | Falta de pipeline de CI en GitHub Actions. | `.github/workflows/ci.yml` | Workflow de CI con lint, typecheck, pytest con PostgreSQL y build de Next.js. | `.github/workflows/ci.yml` | 🟡 En Progreso |
| **ME-06** | **MEDIO** | Afirmaciones de UI desalineadas con la implementación técnica real. | `apps/web/app/*` | Ajuste de etiquetas, estados y eliminación de indicadores falsos de operatividad. | Inspección visual y E2E | 🟡 En Progreso |
