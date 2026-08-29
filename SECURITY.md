# Políticas de Seguridad de ORBÍTICA POS

- **Hash de Contraseñas:** Argon2id (OWASP recommended: 64MB memory cost, 3 time cost, 4 parallelism).
- **Gestión de Sesiones:** Refresh tokens con hash SHA-256 en base de datos entregados en cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Protección contra Fuerza Bruta:** Bloqueo progresivo tras 5 intentos fallidos (15 minutos).
- **Secretos y Certificados:** Certificados criptográficos `.p12` de Hacienda Costa Rica nunca se versionan en Git y se cifran con AES-256-GCM.
- **Control de Acceso (RBAC):** Permisos granulares verificados por decoradores de dependencia.
