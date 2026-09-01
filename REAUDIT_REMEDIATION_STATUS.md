# ORBÍTICA POS — Matriz y Estado de Remediación de la Segunda Auditoría

**Rama de Trabajo:** `fix/reaudit-production-blockers`  
**Fecha de Inicio:** 2026-08-31  
**Estado General:** EN EJECUCIÓN (Fase 0 - Contención Iniciada)

---

## 1. Clasificación y Estados de los 22 Hallazgos

| ID | Categoría | Descripción del Hallazgo | Estado | Archivos Involucrados | Criterio de Verificación |
|---|---|---|---|---|---|
| **SEC-01** | Seguridad | Bypass de login en frontend por fallback/mock que permite acceso con credenciales inválidas. | **IN_PROGRESS** | `apps/web/app/(auth)/login/page.tsx`, `apps/web/features/store/store-context.tsx` | Prueba negativa E2E: 401 para credenciales inexistentes sin redirección a dashboard. |
| **SEC-02** | Seguridad | `ASSIGNABLE_ROLES` no se valida en creación/edición de usuarios en `UserService`. | **OPEN** | `apps/api/app/services/user_service.py`, `apps/api/app/api/v1/users.py` | Prueba HTTP: Owner/Manager no pueden crear Superadmin/Owner; prohíbe auto-escalamiento. |
| **SEC-03** | Seguridad | Vulnerabilidades reportadas por `npm audit` en Next.js / dependencias web. | **OPEN** | `apps/web/package.json` | `npm audit --omit=dev` con 0 vulnerabilidades altas o moderadas. |
| **SEC-04** | Seguridad | Rate limiting y revocación de familia de Refresh Tokens ante reutilización. | **OPEN** | `apps/api/app/security/rate_limiter.py`, `apps/api/app/services/auth_service.py` | Prueba de detección de token robado: revoca toda la sesión. |
| **TEN-01** | Multi-Tenant | Validación estricta de `X-Branch-ID` y prevención de IDOR en inventario, compras, soporte. | **OPEN** | `apps/api/app/security/deps.py`, `apps/api/app/services/*` | Prueba con 2 organizaciones: lectura/escritura cruzada rechazada con 403/404. |
| **POS-01** | Persistencia | `store-context.tsx` conserva productos, ventas, inventario, clientes y caja en `localStorage`. | **OPEN** | `apps/web/features/store/store-context.tsx` | Rediseño a consumo 100% REST FastAPI; `localStorage` solo para tema/preferencias visuales. |
| **POS-02** | Transaccional | Falta de idempotencia (`Idempotency-Key`) en ventas, pagos y emisión de comprobantes. | **OPEN** | `apps/api/app/services/sale_service.py`, `apps/api/app/models/sale.py` | Petición repetida con misma clave devuelve venta existente; payload diferente devuelve 409. |
| **POS-03** | Concurrencia | Prueba de bloqueo pesimista `SELECT FOR UPDATE` y prevención de carreras en secuencias fiscales. | **OPEN** | `apps/api/app/services/consecutive_service.py`, `apps/api/tests/test_pos_concurrency.py` | Prueba de transacciones concurrentes PostgreSQL reales con hilos/procesos simultáneos. |
| **HAC-01** | Hacienda v4.4 | Eliminación total de `send_to_hacienda_simulated()` y marcas locales de `ACCEPTED`. | **OPEN** | `apps/api/app/services/electronic_invoicing_service.py`, `apps/api/app/api/v1/hacienda.py` | Documento permanece `PROCESSING` (201) hasta consulta real con `ind-estado: aceptado`. |
| **HAC-02** | Hacienda v4.4 | Generador XML v4.4 usa variables de configuración desalineadas o faltantes. | **OPEN** | `apps/api/app/services/hacienda_xml_generator_v44.py`, `apps/api/app/core/config.py` | Configuración tipada en Pydantic Settings para Proveedor de Sistemas y emisor. |
| **HAC-03** | Hacienda v4.4 | Validación obligatoria de XML contra XMLSchema XSD oficial v4.4 de Hacienda. | **OPEN** | `apps/api/app/services/hacienda_xml_generator_v44.py`, `apps/api/schemas/hacienda/v4.4/` | `lxml.etree.XMLSchema` valida Factura, Tiquete, NC y ND antes de firmar y enviar. |
| **HAC-04** | Hacienda v4.4 | Rechazo estricto de CAByS dummy (`0000000000000`) y tarifas tributarias hardcodeadas. | **OPEN** | `apps/api/app/services/hacienda_xml_generator_v44.py` | Validación de 13 dígitos numéricos y códigos de tarifa DGT (01-08) dinámicos. |
| **HAC-05** | Hacienda v4.4 | Firma XAdES-EPES v1.3.2 referencia política oficial vigente v4.4 y validación independiente. | **OPEN** | `apps/api/app/services/xades_signer_v44.py` | Verificación de digests (`SignedProperties`, `KeyInfo`, `Document`) con C14N estándar. |
| **HAC-06** | Hacienda v4.4 | Custodia de certificados `.p12` y credenciales ATV con clave Fernet/AES-256 válida por entorno. | **OPEN** | `apps/api/app/services/fiscal_security_service.py` | Verificación de cifrado/descifrado sin recodificaciones improvisadas. |
| **PUR-01** | Compras | Persistencia atómica de compras con encabezado, líneas, proveedor e incremento de stock. | **OPEN** | `apps/api/app/services/purchase_service.py`, `apps/api/app/models/purchase.py` | Venta y compra reflejan movimientos en `inventory_levels` y `inventory_transactions`. |
| **SUP-01** | Superadmin | Superadmin Hub y Soporte desconectados del estado local y sincronizados con PostgreSQL. | **OPEN** | `apps/web/features/superadmin/superadmin-context.tsx`, `apps/api/app/api/v1/superadmin.py` | Consulta en tiempo real de métricas, tenants, tickets y notas internas protegidas. |
| **AUD-01** | Auditoría | Protección de `audit_logs` contra `UPDATE` y `DELETE` y hash SHA-256 encadenado. | **OPEN** | `apps/api/app/models/audit_log.py`, `apps/api/app/services/audit_service.py` | Triggers/permisos PostgreSQL y validación de hash génesis y secuencia inmutable. |
| **DB-01** | Base de Datos | Migraciones Alembic totalmente sincronizadas con los modelos SQLAlchemy. | **OPEN** | `apps/api/app/db/migrations/versions/` | `alembic upgrade head` sobre base limpia genera esquema idéntico a `Base.metadata`. |
| **DEP-01** | DevOps | `requirements.txt` y dependencias fijadas (`pyotp`, `lxml`, `cryptography`, etc.). | **OPEN** | `apps/api/requirements.txt`, `Dockerfile` | Instalación en Python 3.12 limpio ejecuta `pip check` sin errores. |
| **CFG-01** | Configuración | Unificación de variables de entorno entre `docker-compose.yml`, `.env.example` y Settings. | **OPEN** | `docker-compose.yml`, `apps/api/.env.example`, `apps/api/app/core/config.py` | Validación Pydantic en arranque; falla seguro ante omisión de claves maestras. |
| **CI-01** | DevOps | Pipeline de CI automatizado con GitHub Actions para lint, typecheck, tests y migraciones. | **OPEN** | `.github/workflows/ci.yml` | Pipeline ejecuta tests backend, typecheck web, migraciones PG y análisis de seguridad. |
| **E2E-01** | QA / Testing | Suite Playwright E2E real conectando frontend, backend FastAPI y base de datos PostgreSQL. | **OPEN** | `apps/web/e2e/` | Pruebas de flujo completo: Registro -> Login -> POS -> Venta -> Caja -> Soporte. |
| **EXT-01** | Integraciones | Pruebas de Sandbox ATV oficial, Cloudflare R2 privado y servicio de correo transaccional. | **BLOCKED_EXTERNAL** | `apps/api/app/infrastructure/external/` | Requiere credenciales de Sandbox ATV y bucket R2 provistos por el usuario. |

---

## 2. Bloqueos Externos Registrados

1. **EXT-01 / Acceso a Sandbox ATV de Hacienda**:
   - Para la emisión y consulta real en el Sandbox de Hacienda, se requieren las credenciales de prueba (`usuario ATV`, `contraseña ATV` y archivo de certificado criptográfico `.p12` de pruebas con su PIN).
   - *Plan de Mitigación:* Se implementa y verifica todo el pipeline criptográfico (XSD oficial v4.4, C14N, XAdES-EPES, cliente OAuth2 IdP) con pruebas de validación estructural y firma independiente; el envío al endpoint real se marca `BLOCKED_EXTERNAL` hasta la inyección de credenciales de prueba.
2. **EXT-02 / Almacenamiento Cloudflare R2 y Correo Transaccional (Resend/SES)**:
   - Requiere `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `RESEND_API_KEY`.
   - *Plan de Mitigación:* Interfaz de almacenamiento y correo desacoplada con adaptador local seguro para pruebas y adaptador S3/R2 para producción.
