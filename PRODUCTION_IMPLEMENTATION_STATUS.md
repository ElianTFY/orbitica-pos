# Estado de Implementación de Producción — ORBÍTICA POS

**Fecha de inicio:** 2026-08-31  
**Rama activa:** `feat/production-pilot-hacienda-v44`  
**Commit base:** `18f03a8` (chore: remove workflows for initial github push without workflow oauth scope)  
**Objetivo:** Habilitar un piloto cerrado y seguro con una empresa familiar costarricense que migra desde POSMóvil, con facturación electrónica oficial Hacienda v4.4.

---

## 📊 Resumen Ejecutivo del Estado

| Fase | Descripción | Estado | Pruebas |
| :--- | :--- | :---: | :---: |
| **Fase 0** | Contención: Confirmación de auditoría, eliminación de auth mock y fake success | 🟡 En Progreso | 16/16 pasan |
| **Fase 1** | Plataforma Segura: Configuración, Argon2id, MFA TOTP, Step-Up, RBAC servidor | 🟡 En Progreso | Pendiente |
| **Fase 2** | Núcleo POS: Transacciones PostgreSQL, consecutivo atómico, caja, inventario | ⚪ Pendiente | Pendiente |
| **Fase 3** | Hacienda v4.4: XSD v4.4, XAdES-EPES v1.3.2, Sandbox/Producción, P12 AES-256 | ⚪ Pendiente | Pendiente |
| **Fase 4** | Superadmin & Soporte: PostgreSQL real, tickets, acceso delegado, auditoría | ⚪ Pendiente | Pendiente |
| **Fase 5** | Piloto & Cutover: E2E Playwright, migración POSMóvil, contingencia | ⚪ Pendiente | Pendiente |

---

## 🔍 Hallazgos Confirmados de la Auditoría Inicial

- [x] **CR-01:** Rutas mock en Next.js interceptaban `/api/v1/auth/login` y creaban cookies JSON sin firma. (Contenido: Eliminadas rutas mock en `apps/web/app/api/v1`, configurado proxy transparente hacia FastAPI).
- [x] **CR-02:** `localStorage` actuaba como almacén operativo en `store-context.tsx`.
- [x] **CR-03:** Superadmin y soporte operaban con mutaciones de estado local y éxitos simulados en reembolsos.
- [x] **CR-04:** `simulate_success=True` en `apps/api/app/api/v1/hacienda.py`, respuestas hardcodeadas y firmador XMLDSig sin canonicalización C14N estándar.
- [x] **CR-05:** `role` aceptado como string sin validación de jerarquía permitiendo escalamiento a superadmin.
- [x] **CR-06:** Endpoints con UUID sin validación de pertenencia al tenant autenticado (`organization_id`).
- [x] **AL-01:** Consecutivos calculados con `COUNT + 1` en lugar de secuencias atómicas bloqueadas por fila.
- [x] **AL-02:** Falta de bloqueo `SELECT FOR UPDATE` en ventas concurrentes.
- [x] **AL-03:** Auditoría sin encadenamiento criptográfico.
- [x] **AL-04:** Desconexión entre Next.js y FastAPI en despliegues Vercel.
- [x] **AL-05:** Códigos de recuperación y verificación sin expiración estricta ni rate-limiting.
- [x] **AL-06:** Valores default de secretos en `config.py` y `docker-compose.yml`.
- [x] **AL-07:** Migraciones Alembic incompletas.
- [x] **AL-08:** Pruebas E2E simuladas en memoria en lugar de probar HTTP real.
- [x] **AL-09:** Vulnerabilidades en dependencias base.
- [x] **AL-10:** Compras y movimientos sin persistencia relacional completa.
- [x] **ME-01 a ME-06:** Controles HTTP, CSP, nombres inconsistentes de variables, locks de dependencias y afirmaciones de UI desalineadas.

---

## 🛠️ Registro de Decisiones Técnicas (ADR)

1. **ADR-01: FastAPI como Único Backend Autoritativo**
   - Se eliminaron todas las rutas simuladas en `apps/web/app/api/v1/`. Next.js delega el tráfico de API directamente a FastAPI mediante proxy rewrite.
2. **ADR-02: Sesiones Seguras con Cookies HttpOnly y Refresh Token Hash**
   - Access token JWT de 15 min, refresh token aleatorio de 48 bytes hasheado con SHA-256 en PostgreSQL, cookie `HttpOnly`, `Secure` (en prod) y `SameSite=Lax`.
3. **ADR-03: Cifrado Criptográfico de Credenciales Fiscales**
   - Los certificados `.p12`, PINs y contraseñas de ATV se cifran con AES-256-GCM / Fernet utilizando `ENCRYPTION_MASTER_KEY` almacenada fuera de PostgreSQL.
4. **ADR-04: Numeración Consecutiva Atómica**
   - Creación de tabla `consecutive_sequences` con clave `(organization_id, branch_number, terminal_number, document_type)` y actualización con `SELECT ... FOR UPDATE`.
5. **ADR-05: Firmador XAdES-EPES v1.3.2 con lxml**
   - Sustitución de `xml.etree` por `lxml` con canonicalización estándar `REC-xml-c14n-20010315` y validación contra esquemas XSD v4.4 oficiales.

---

## 🔒 Bloqueadores e Información Requerida del Propietario

> Los siguientes datos serán solicitados mediante la interfaz web protegida antes de la emisión en Producción (las pruebas se realizan con fixtures de Sandbox):

- [ ] Cédula física o jurídica del emisor.
- [ ] Razón social y nombre comercial exactos según el RUT.
- [ ] Código de actividad económica principal (6 dígitos).
- [ ] Ubicación tributaria (Provincia, Cantón, Distrito, Barrio).
- [ ] Certificado criptográfico `.p12` de ATV.
- [ ] PIN de 4 dígitos del certificado.
- [ ] Usuario y contraseña API de ATV (Sandbox y Producción).
- [ ] Último número de consecutivo emitido en POSMóvil para asignar una terminal independiente en ORBÍTICA.

---

## 🚀 Próximo Paso Concreto

Completar las pruebas de Fase 1 (Autenticación real, TOTP MFA y Step-Up), crear los modelos PostgreSQL en Fase 2 (Aislamiento multi-tenant y secuencias atómicas) y generar las migraciones Alembic.
