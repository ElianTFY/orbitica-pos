# ORBÍTICA POS — Security & Incident Response Runbook

## 1. Gestión y Rotación de Secretos Criptográficos

### 1.1 Llaves Principales del Sistema
| Variable | Longitud / Algoritmo | Propósito | Rotación Recomendada |
|---|---|---|---|
| `FERNET_KEY` | 32 bytes base64 (AES-256) | Cifrado de certificados `.p12` y contraseñas ATV | Anual o ante sospecha |
| `SECRET_KEY` | 64 caracteres alfanuméricos | Firma de JWT (HS256) y Step-Up HMAC | Semestral |
| `DATABASE_URL` | PostgreSQL SSL connection | Acceso a la base de datos | Según política Cloud |

### 1.2 Procedimiento de Rotación de `FERNET_KEY` (Re-cifrado en Reposo)
1. Iniciar ventana de mantenimiento en el backend.
2. Definir `FERNET_KEY_OLD` con la clave actual y `FERNET_KEY` con la nueva clave generada con:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
3. Ejecutar el script de migración criptográfica para re-cifrar todas las filas en `fiscal_credentials`.
4. Remover `FERNET_KEY_OLD` y reiniciar el servicio.

---

## 2. Respuesta a Incidentes de Seguridad

### 2.1 Certificado Digital `.p12` o PIN Comprometido
1. Acceder a **Orbítica Hub Superadmin** o ejecutar revocación de emergencia.
2. En la organización afectada, cambiar `is_active = False` en `fiscal_credentials`.
3. Notificar de inmediato al representante legal de la empresa para revocar el certificado en la Autoridad Certificadora (BCCR / SINPE / ATV) y emitir uno nuevo.
4. Cargar el nuevo archivo `.p12` y PIN cifrado en Orbítica POS.

### 2.2 Sospecha de Intrusión o Compromiso de Cuenta
1. **Bloqueo Inmediato**: Ejecutar revocación de sesiones en `users` incrementando el `token_version` o revocando tokens activos.
2. **Step-Up Forzado**: Se invalidan todos los tokens de Step-Up Authentication activos.
3. **Verificación de Auditoría**: Ejecutar la verificación de integridad de la cadena forense con:
   ```python
   is_valid, count, err = await AuditService.verify_audit_chain(db)
   ```
   Si `is_valid == False`, identificar el registro alterado indicado en `err` y aislar el servidor para análisis forense.

---

## 3. Políticas de Autenticación y Control de Acceso

- **Argon2id**: `time_cost=3`, `memory_cost=65536` (64 MB), `parallelism=4`.
- **JWT TTL**: 15 minutos exactos para Access Token.
- **Refresh Token**: 48 bytes criptográficos aleatorios, almacenados con hash SHA-256 en BD y transportados exclusivamente en cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- **MFA / TOTP**: Obligatorio para cuentas con rol `SUPERADMIN` y recomendado para administradores de empresa.
- **Step-Up Authentication**: Token HMAC-SHA256 de un solo uso con TTL de 5 minutos, vinculado estrictamente a `(user_id, action, resource)`.
