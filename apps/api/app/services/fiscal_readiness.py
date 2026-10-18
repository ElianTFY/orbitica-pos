from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
import re
from app.models.fiscal_worker import FiscalWorkerHeartbeat
from app.models.outbox import HaciendaOutbox
from app.services.fiscal_profile import validate_emitter_profile
from app.services.fiscal_security_service import FiscalSecurityService
from app.models.invoice import ElectronicInvoice
from app.core.config import settings
from app.core.exceptions import BadRequestException

async def require_live_readiness(db, organization_id, environment):
    if environment not in {"STAGING", "PRODUCTION"}:
        raise BadRequestException("Ambiente fiscal desconocido")
    if environment != "PRODUCTION":
        return
    if not settings.HACIENDA_LIVE_EMISSION_ENABLED or not settings.HACIENDA_SANDBOX_VALIDATED:
        raise BadRequestException("Producción bloqueada: requiere autorización de emisión y validación de Sandbox")
    documents = await accepted_sandbox_documents(db, organization_id)
    if not {"01", "04", "03"}.issubset(documents):
        raise BadRequestException("Esta empresa requiere factura, tiquete y nota de crédito aceptados en Sandbox")


async def accepted_sandbox_documents(db, organization_id):
    return set((await db.execute(select(ElectronicInvoice.doc_type).where(
        ElectronicInvoice.organization_id == organization_id,
        ElectronicInvoice.environment == "STAGING",
        ElectronicInvoice.status == "ACCEPTED",
        ElectronicInvoice.sent_to_hacienda_at.is_not(None),
        ElectronicInvoice.hacienda_response_xml.is_not(None),
        ElectronicInvoice.hacienda_response_xml != "",
    ))).scalars().all())


async def fiscal_readiness_report(db, org, environment):
    """Inspect operational metadata without decrypting the private key."""
    now = datetime.now(timezone.utc)
    cred = await FiscalSecurityService.get_credential_record(db, org.id, environment)
    active = bool(cred and cred.is_active)
    expiration = cred.certificate_expiration if active else None
    if expiration and expiration.tzinfo is None:
        expiration = expiration.replace(tzinfo=timezone.utc)
    try:
        validate_emitter_profile(org)
        profile_ok, profile_message = True, "Datos fiscales del emisor completos"
    except BadRequestException as exc:
        profile_ok, profile_message = False, exc.message
    latest = (await db.execute(select(FiscalWorkerHeartbeat).order_by(
        FiscalWorkerHeartbeat.last_seen_at.desc()).limit(1))).scalar_one_or_none()
    active_workers = (await db.execute(select(func.count()).select_from(FiscalWorkerHeartbeat).where(
        FiscalWorkerHeartbeat.status == "RUNNING",
        FiscalWorkerHeartbeat.last_seen_at >= now - timedelta(seconds=60),
    ))).scalar_one()
    checks = [
        {"code": "EMITTER_PROFILE", "ok": profile_ok, "message": profile_message},
        {"code": "ATV_USER", "ok": active and bool(cred.encrypted_atv_username and cred.encrypted_atv_password), "message": "Usuario y contraseña API guardados para este ambiente"},
        {"code": "CERTIFICATE", "ok": active and bool(cred.encrypted_p12 and cred.encrypted_pin), "message": "Llave criptográfica y PIN guardados para este ambiente"},
        {"code": "CERTIFICATE_EXPIRY", "ok": bool(expiration and expiration > now), "message": "Certificado vigente"},
        {"code": "CONNECTION_TEST", "ok": active and cred.connection_test_success is True, "message": "Última prueba de autenticación de las credenciales guardadas exitosa"},
        {"code": "PROVIDER_ID", "ok": bool(re.fullmatch(r"\d{9,12}", settings.SOFTWARE_PROVIDER_TAX_ID)) and settings.SOFTWARE_PROVIDER_TAX_ID != "3101000000", "message": "Identificación del proveedor del sistema configurada"},
        {"code": "PROVIDER_NAME", "ok": bool(settings.SOFTWARE_PROVIDER_NAME.strip()) and settings.SOFTWARE_PROVIDER_NAME != "ORBITICA STUDIO S.A.", "message": "Nombre del proveedor del sistema configurado"},
        {"code": "WORKER", "ok": active_workers > 0, "message": "Servicio de envío fiscal activo" if active_workers else "El servicio de envío fiscal no está activo; los comprobantes permanecerán en cola"},
        {"code": "EMAIL", "ok": settings.email_provider_configured, "message": "Servicio de entrega de correo fiscal configurado"},
    ]
    accepted = await accepted_sandbox_documents(db, org.id)
    if environment == "PRODUCTION":
        checks.extend([
            {"code": "SANDBOX_APPROVED", "ok": settings.HACIENDA_SANDBOX_VALIDATED, "message": "Piloto de pruebas autorizado por el operador"},
            {"code": "SANDBOX_DOCUMENTS", "ok": {"01", "04", "03"}.issubset(accepted), "message": "Esta empresa tiene factura, tiquete y nota de crédito aceptados en pruebas"},
            {"code": "LIVE_ENABLED", "ok": settings.HACIENDA_LIVE_EMISSION_ENABLED, "message": "Emisión en producción habilitada por el operador"},
        ])
    counts = dict((await db.execute(select(HaciendaOutbox.status, func.count()).join(
        ElectronicInvoice, ElectronicInvoice.id == HaciendaOutbox.invoice_id,
    ).where(
        HaciendaOutbox.organization_id == org.id,
        ElectronicInvoice.organization_id == org.id,
        ElectronicInvoice.environment == environment,
    ).group_by(HaciendaOutbox.status))).all())
    email_pending = (await db.execute(select(func.count()).select_from(ElectronicInvoice).where(
        ElectronicInvoice.organization_id == org.id,
        ElectronicInvoice.environment == environment,
        ElectronicInvoice.status == "ACCEPTED",
        ElectronicInvoice.receiver_email.is_not(None),
        ElectronicInvoice.receiver_email != "",
        ElectronicInvoice.email_sent_at.is_(None),
    ))).scalar_one()
    return {
        "ready": all(check["ok"] for check in checks), "environment": environment, "checks": checks,
        "worker": {"active": active_workers > 0, "last_seen_at": latest.last_seen_at if latest else None},
        "queue": {
            "pending": sum(counts.get(status, 0) for status in ("PENDING_SIGNATURE", "PENDING", "QUEUED", "PROCESSING", "SENT")),
            "attention": sum(counts.get(status, 0) for status in ("ERROR", "CONTINGENCY", "REJECTED")),
            "email_pending": email_pending,
        },
        "sandbox_documents": [{"doc_type": code, "name": name, "accepted": code in accepted}
                              for code, name in (("01", "Factura"), ("04", "Tiquete"), ("03", "Nota de crédito"))],
    }
