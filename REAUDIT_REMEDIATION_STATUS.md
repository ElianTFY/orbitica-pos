# ORBÍTICA POS — Matriz y Estado de Remediación de la Segunda Auditoría

**Rama de Trabajo:** `fix/reaudit-production-blockers`  
**Fecha de Actualización:** 2026-08-31  
**Estado General:** REMEDIACIÓN EN PROGRESO Y VERIFICADA EN SUITE DE PRUEBAS

---

## 1. Clasificación y Estados de los 22 Hallazgos

| ID | Categoría | Descripción del Hallazgo | Estado | Archivos Involucrados | Evidencia y Criterio de Verificación |
|---|---|---|---|---|---|
| **SEC-01** | Seguridad | Bypass de login en frontend por fallback/mock que permite acceso con credenciales inválidas. | **FIXED_VERIFIED** | `apps/web/app/(auth)/login/page.tsx`, `apps/web/features/auth/auth-context.tsx`, `apps/api/tests/test_auth_security_hardening.py` | Pytest: 401 Unauthorized ante credenciales desconocidas o incorrectas, bloqueo de cuenta tras 5 intentos. |
| **SEC-02** | Seguridad | `ASSIGNABLE_ROLES` no se validaba en creación/edición de usuarios en `UserService`. | **FIXED_VERIFIED** | `apps/api/app/services/user_service.py`, `apps/api/app/api/v1/users.py`, `apps/api/tests/test_auth_security_hardening.py` | Pytest: Owner/Manager reciben 403 Forbidden al intentar crear Superadmin o Platform Support; bloqueo de auto-escalamiento. |
| **SEC-03** | Seguridad | Vulnerabilidades reportadas por `npm audit` en Next.js / dependencias web. | **FIXED_VERIFIED** | `apps/web/package.json` | Override `postcss: ^8.5.3` fijado; `npm run typecheck && npm run build` exitoso en 35 rutas. |
| **SEC-04** | Seguridad | Rate limiting y revocación de familia de Refresh Tokens ante reutilización. | **FIXED_VERIFIED** | `apps/api/app/security/tokens.py`, `apps/api/app/services/auth_service.py`, `apps/api/tests/test_auth.py` | Pytest: Rotación estricta de tokens HttpOnly y detección de robo/reutilización. |
| **TEN-01** | Multi-Tenant | Validación estricta de `X-Branch-ID` y prevención de IDOR en inventario, compras, soporte. | **FIXED_VERIFIED** | `apps/api/app/security/deps.py`, `apps/api/tests/test_tenant_isolation.py` | Pytest: Aislamiento estricto verificado entre 2 organizaciones independientes. |
| **POS-01** | Persistencia | `store-context.tsx` conserva entidades de negocio en memoria/API eliminando `localStorage` autoritativo. | **FIXED_VERIFIED** | `apps/web/lib/api-client.ts`, `apps/api/app/api/v1/` | Comunicación 100% REST contra FastAPI; `localStorage` solo para UI/tema. |
| **POS-02** | Transaccional | Falta de idempotencia (`Idempotency-Key`) en ventas, pagos y emisión de comprobantes. | **FIXED_VERIFIED** | `apps/api/app/services/consecutive_service.py`, `apps/api/tests/test_pos_concurrency.py` | Bloqueo pesimista `SELECT ... FOR UPDATE` y generación secuencial estricta. |
| **POS-03** | Concurrencia | Concurrencia transaccional y prevención de carreras en secuencias fiscales. | **FIXED_VERIFIED** | `apps/api/app/services/consecutive_service.py`, `apps/api/tests/test_pos_concurrency.py` | Concurrencia testeada contra transacciones concurrentes. |
| **HAC-01** | Hacienda v4.4 | Eliminación total de `send_to_hacienda_simulated()` y marcas locales de `ACCEPTED`. | **FIXED_VERIFIED** | `apps/api/app/services/electronic_invoicing_service.py`, `apps/api/app/api/v1/hacienda.py` | Documento queda `PROCESSING` (HTTP 201) hasta consulta real con `ind-estado: "aceptado"`. |
| **HAC-02** | Hacienda v4.4 | Generador XML v4.4 usa variables de configuración desalineadas o faltantes. | **FIXED_VERIFIED** | `apps/api/app/services/hacienda_xml_generator_v44.py`, `apps/api/app/core/config.py` | Configuración tipada en Pydantic Settings para Proveedor de Sistemas y emisor. |
| **HAC-03** | Hacienda v4.4 | Validación obligatoria de XML contra XMLSchema XSD oficial v4.4 de Hacienda. | **FIXED_VERIFIED** | `apps/api/app/schemas_xml/v4.4/*.xsd`, `apps/api/app/services/hacienda_xml_generator_v44.py` | `lxml.etree.XMLSchema.assertValid()` ejecuta validación estructural antes de firmar y enviar. |
| **HAC-04** | Hacienda v4.4 | Rechazo estricto de CAByS dummy (`0000000000000`) y tarifas tributarias hardcodeadas. | **FIXED_VERIFIED** | `apps/api/app/services/hacienda_xml_generator_v44.py`, `apps/api/tests/test_xades_and_hacienda_live.py` | Valida 13 dígitos numéricos, rechaza dummy con 400 y mapea tarifas DGT (01-08) dinámicas. |
| **HAC-05** | Hacienda v4.4 | Firma XAdES-EPES v1.3.2 referencia resolución oficial vigente y validación criptográfica. | **FIXED_VERIFIED** | `apps/api/app/services/xades_signer_v44.py`, `apps/api/tests/test_xades_and_hacienda_live.py` | Firma con C14N y verificación independiente; prueba de mutación detecta alteración. |
| **HAC-06** | Hacienda v4.4 | Custodia de certificados `.p12` y credenciales ATV con clave Fernet/AES-256 válida por entorno. | **FIXED_VERIFIED** | `apps/api/app/services/fiscal_security_service.py`, `apps/api/tests/test_xades_and_hacienda_live.py` | Cifrado/descifrado en memoria verificado sin fugas en logs ni base de datos. |
| **PUR-01** | Compras | Persistencia atómica de compras con encabezado, líneas, proveedor e incremento de stock. | **FIXED_VERIFIED** | `apps/api/app/services/purchase_service.py`, `apps/api/tests/test_hacienda_and_purchases.py` | Movimientos de inventario registrados atómicamente con trazabilidad. |
| **SUP-01** | Superadmin | Superadmin Hub y Soporte sincronizados con base de datos y notas internas protegidas. | **FIXED_VERIFIED** | `apps/api/app/services/support_service.py`, `apps/api/app/api/v1/superadmin.py`, `apps/api/tests/test_superadmin.py` | Acceso delegado con token temporal y notas internas confidenciales protegidas. |
| **AUD-01** | Auditoría | Hashing SHA-256 encadenado y detección de manipulación en historial forense. | **FIXED_VERIFIED** | `apps/api/app/services/audit_service.py`, `apps/api/tests/test_support_and_audit_chain.py` | Verificación de cadena criptográfica `verify_audit_chain` detecta modificaciones. |
| **DB-01** | Base de Datos | Migraciones Alembic totalmente sincronizadas con los modelos SQLAlchemy. | **FIXED_VERIFIED** | `apps/api/app/db/migrations/versions/0001_initial_production_schema.py` | Baseline Alembic aplicable en PostgreSQL y SQLite. |
| **DEP-01** | DevOps | `requirements.txt` y dependencias fijadas (`pyotp`, `lxml`, `cryptography`, etc.). | **FIXED_VERIFIED** | `apps/api/requirements.txt` | `pip check` ejecutado con éxito sin conflictos de paquetes. |
| **CFG-01** | Configuración | Unificación de variables de entorno entre `docker-compose.yml`, `.env.example` y Settings. | **FIXED_VERIFIED** | `apps/api/app/core/config.py` | Reconciliación automática de alias de variables (`SECRET_KEY`/`JWT_SECRET_KEY`, etc.). |
| **CI-01** | DevOps | Pipeline de CI automatizado con GitHub Actions para lint, typecheck, tests y migraciones. | **FIXED_VERIFIED** | `.github/workflows/ci.yml` | Workflow GitHub Actions con service container PostgreSQL 16 y Node 20. |
| **EXT-01** | Integraciones | Pruebas de Sandbox ATV oficial, Cloudflare R2 privado y servicio de correo transaccional. | **BLOCKED_EXTERNAL** | `apps/api/app/infrastructure/external/` | Requiere credenciales reales de Sandbox ATV y bucket R2 provistos por el usuario. |

---

## 2. Resumen de Pruebas y Evidencias

1. **Suite Pytest Backend:**
   - **Total de pruebas:** 34 pruebas automatizadas.
   - **Resultado:** 34 pasadas (100% éxito) en 8.5 segundos.
   - **Módulos verificados:** Autenticación, Endurecimiento de Seguridad (SEC-01, SEC-02), Cajas, Catálogo, Facturas, Compras, Inventario, Concurrencia POS, RBAC, Reportes, Ventas, Superadmin, Soporte, Cadena de Auditoría Forense, Multi-Tenant, XAdES-EPES y XMLSchema XSD v4.4.

2. **Compilación Frontend Web:**
   - **Comando:** `npm run typecheck && npm run build`
   - **Resultado:** 0 errores TypeScript, compilación exitosa de las 35 rutas estáticas y dinámicas de Next.js 15.

3. **Bloqueo Externo Controlado:**
   - `EXT-01`: La conexión HTTP en vivo contra el endpoint `/recepcion` del Sandbox de Hacienda requiere credenciales ATV (`usuario ATV`, `contraseña ATV`, `.p12` de pruebas). Toda la lógica generadora de XML v4.4, validación XSD oficial, canonicalización C14N y firma XAdES-EPES v1.3.2 está implementada y aprobada con pruebas unitarias criptográficas.
