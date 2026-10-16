from sqlalchemy import select
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
    documents = set((await db.execute(select(ElectronicInvoice.doc_type).where(
        ElectronicInvoice.organization_id == organization_id,
        ElectronicInvoice.environment == "STAGING",
        ElectronicInvoice.status == "ACCEPTED",
        ElectronicInvoice.sent_to_hacienda_at.is_not(None),
        ElectronicInvoice.hacienda_response_xml.is_not(None),
        ElectronicInvoice.hacienda_response_xml != "",
    ))).scalars().all())
    if not {"01", "04", "03"}.issubset(documents):
        raise BadRequestException("Esta empresa requiere factura, tiquete y nota de crédito aceptados en Sandbox")
