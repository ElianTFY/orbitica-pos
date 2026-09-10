# PROMPT DE AUDITORÍA Y VERIFICACIÓN PARA CHATGPT

Copia y pega el siguiente bloque en ChatGPT para que realice la auditoría técnica exhaustiva sobre el código remediado:

```markdown
Actúa como auditor principal de ciberseguridad, arquitectura backend y cumplimiento tributario de Costa Rica.
Revisa la remediación final implementada en el repositorio de Orbítica POS:

- **Repositorio:** https://github.com/ElianTFY/orbitica-pos
- **Rama:** fix/final-production-readiness
- **Comparativa / Diff contra la base anterior:**
  https://github.com/ElianTFY/orbitica-pos/compare/fix/third-audit-production-blockers...fix/final-production-readiness
- **Informe de Remediación Auditable:**
  https://github.com/ElianTFY/orbitica-pos/blob/fix/final-production-readiness/FINAL_AUDITABLE_REMEDIATION_REPORT.md

Por favor audita y valida punto por punto que los 22 controles originales hayan sido efectivamente resueltos en el código (sin simulaciones, sin atajos y con pruebas reales):

1. **Aislamiento Multiempresa y Multiorganización:**
   - Verifica `apps/api/app/security/deps.py` y `CurrentUserContext`. ¿El superadmin tiene prohibido operar recursos de un tenant sin `X-Delegated-Token` activo y vigente?
   - ¿Se valida que `Branch.organization_id == context.organization_id` en todas las rutas?
2. **Esquemas Oficiales Hacienda v4.4:**
   - Verifica `apps/api/app/schemas_xml/v4.4/`. ¿Se eliminaron los esquemas simplificados de 8 KB y se reemplazaron por los esquemas canónicos de Hacienda (>118 KB)?
   - Verifica `apps/api/tests/golden_files/v4.4/` y `apps/api/tests/test_hacienda_v44_official_documents.py`. ¿Los 5 documentos (01 Factura, 02 ND, 03 NC, 04 Tiquete, 05 Mensaje Receptor) cumplen la estructura estricta?
3. **Firma Digital XAdES-EPES v1.3.2:**
   - Revisa `apps/api/app/services/xades_signer_v44.py`. ¿Verifica la vigencia y caducidad de certificados PKCS#12? ¿Aplica canonicalización C14N y digest SHA-256?
4. **Outbox Pattern y Worker de Hacienda:**
   - Revisa `apps/api/app/models/outbox.py` y `apps/api/app/workers/hacienda_outbox_worker.py`.
   - ¿Usa `SELECT ... FOR UPDATE SKIP LOCKED` para concurrencia? ¿Tiene backoff exponencial y activación de contingencia fiscal (`CONTINGENCY`)?
5. **Idempotencia y Concurrencia de Inventario y Consecutivos:**
   - Revisa `apps/api/app/services/inventory_service.py` y `apps/api/app/services/consecutive_service.py`. ¿Se usan bloqueos a nivel de fila y secuencias seguras?
6. **Auditoría Append-Only en Base de Datos:**
   - Revisa `apps/api/app/models/audit_log.py` y `apps/api/app/db/migrations/versions/0002_audit_append_only_triggers.py`.
   - ¿Existen triggers reales en PostgreSQL/SQLite que bloquean sentencias UPDATE y DELETE directas? ¿Se enlaza la cadena de hashes SHA-256?
7. **Fuente de Verdad en Frontend:**
   - Revisa `apps/web/features/store/store-context.tsx`. ¿Se eliminaron los datos mockeados en localStorage? ¿Compila con 0 errores TypeScript (`npm run typecheck`)?

Emite tu dictamen técnico objetivo sobre si el proyecto está listo para producción.
```
