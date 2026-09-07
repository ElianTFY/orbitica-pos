import base64
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.invoice import ElectronicInvoice
from app.models.organization import Organization
from app.core.config import settings
from app.security.deps import CurrentUserContext, require_permissions
from app.schemas.common import StandardResponse
from app.schemas.hacienda import (
    HaciendaCredentialsInput,
    HaciendaConnectionTestInput,
    HaciendaCredentialsResponse,
    HaciendaTestConnectionResponse,
    HaciendaTransmitRequest,
    HaciendaTransmitResponse,
    HaciendaStatusQueryResponse
)
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.electronic_invoicing_service import ElectronicInvoicingService
from app.services.invoice_service import InvoiceService
from app.infrastructure.external.hacienda_api_client import HaciendaAPIClient
from app.core.exceptions import NotFoundException, BadRequestException
from app.services.audit_service import AuditService

router = APIRouter(prefix="/hacienda", tags=["Hacienda Costa Rica v4.4"])

@router.post("/credentials", response_model=StandardResponse[HaciendaCredentialsResponse])
async def save_hacienda_credentials(
    payload: HaciendaCredentialsInput,
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db)
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización asignada")

    p12_bytes = None
    if payload.p12_base64:
        try:
            p12_bytes = base64.b64decode(payload.p12_base64, validate=True)
        except Exception:
            raise BadRequestException("Formato base64 de certificado inválido")

    cred = await FiscalSecurityService.save_fiscal_credentials(
        db=db,
        organization_id=context.organization_id,
        environment=payload.environment,
        p12_bytes=p12_bytes,
        pin=payload.pin,
        atv_username=payload.atv_username,
        atv_password=payload.atv_password
    )
    await AuditService.log_action(
        db=db,
        action="HACIENDA_CREDENTIALS_UPDATED",
        resource="FiscalCredential",
        actor_id=context.user_id,
        organization_id=context.organization_id,
        resource_id=str(cred.id),
        payload_after={
            "environment": cred.environment,
            "has_certificate": bool(cred.encrypted_p12),
        },
    )
    await db.commit()

    data = HaciendaCredentialsResponse(
        environment=cred.environment,
        atv_username=payload.atv_username,
        has_certificate=bool(cred.encrypted_p12),
        is_active=cred.is_active,
        status_message="Credenciales y certificado criptográfico cifrados y guardados exitosamente"
    )
    return StandardResponse(data=data, message="Configuración fiscal guardada")

@router.get("/credentials", response_model=StandardResponse[HaciendaCredentialsResponse])
async def get_hacienda_credentials_status(
    context: CurrentUserContext = Depends(require_permissions("invoicing:read")),
    db: AsyncSession = Depends(get_db)
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")

    org = (await db.execute(
        select(Organization).where(Organization.id == context.organization_id)
    )).scalar_one()
    creds = await FiscalSecurityService.get_decrypted_credentials(
        db=db,
        organization_id=context.organization_id,
        environment=org.atv_environment
    )
    if not creds:
        data = HaciendaCredentialsResponse(
            environment=org.atv_environment,
            atv_username="",
            has_certificate=False,
            is_active=False,
            status_message="No se han configurado credenciales fiscales para esta empresa"
        )
    else:
        exp_str = f" (Vence: {creds['expiration'].strftime('%Y-%m-%d')})" if creds.get("expiration") else ""
        data = HaciendaCredentialsResponse(
            environment=creds["environment"],
            atv_username=creds["username"],
            has_certificate=bool(creds.get("p12_bytes")),
            is_active=True,
            status_message=f"Credenciales configuradas activas{exp_str}"
        )
    return StandardResponse(data=data)

@router.get("/readiness", response_model=StandardResponse[Dict[str, Any]])
async def get_hacienda_readiness(
    context: CurrentUserContext = Depends(require_permissions("invoicing:read")),
    db: AsyncSession = Depends(get_db),
):
    org = (await db.execute(
        select(Organization).where(Organization.id == context.organization_id)
    )).scalar_one()
    creds = await FiscalSecurityService.get_decrypted_credentials(
        db=db,
        organization_id=context.organization_id,
        environment=org.atv_environment,
    )

    checks = [
        {"code": "LEGAL_ID", "ok": org.identification_type in {"01", "02", "03", "04", "05"} and bool(org.identification_number), "message": "Identificación legal del emisor"},
        {"code": "ECONOMIC_ACTIVITY", "ok": len(org.economic_activity_code or "") == 6 and str(org.economic_activity_code).isdigit(), "message": "Actividad económica de 6 dígitos"},
        {"code": "LOCATION", "ok": bool(org.province_code and org.canton_code and org.district_code and org.address_detail), "message": "Ubicación fiscal completa"},
        {"code": "ATV_USER", "ok": bool(creds and creds.get("username") and creds.get("password")), "message": f"Usuario API de Hacienda ({org.atv_environment})"},
        {"code": "CERTIFICATE", "ok": bool(creds and creds.get("p12_bytes") and creds.get("pin")), "message": "Llave criptográfica .p12 y PIN"},
        {"code": "CERTIFICATE_EXPIRY", "ok": bool(creds and creds.get("expiration") and creds["expiration"].replace(tzinfo=creds["expiration"].tzinfo or timezone.utc) > datetime.now(timezone.utc)), "message": "Certificado vigente"},
        {"code": "PROVIDER_ID", "ok": settings.SOFTWARE_PROVIDER_TAX_ID != "3101000000", "message": "Identificación real del proveedor de sistemas"},
    ]
    if org.atv_environment == "PRODUCTION":
        checks.extend([
            {"code": "SANDBOX_APPROVED", "ok": settings.HACIENDA_SANDBOX_VALIDATED, "message": "Piloto Sandbox validado"},
            {"code": "LIVE_ENABLED", "ok": settings.HACIENDA_LIVE_EMISSION_ENABLED, "message": "Emisión en vivo habilitada"},
            {"code": "SMTP", "ok": bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD), "message": "Entrega de correo fiscal configurada"},
        ])

    return StandardResponse(data={
        "ready": all(check["ok"] for check in checks),
        "environment": org.atv_environment,
        "checks": checks,
    })

@router.post("/test-connection", response_model=StandardResponse[HaciendaTestConnectionResponse])
async def test_hacienda_connection(
    payload: HaciendaConnectionTestInput,
    context: CurrentUserContext = Depends(require_permissions("invoicing:read"))
):
    client = HaciendaAPIClient()
    try:
        token = await client.get_oauth_token(
            username=payload.atv_username,
            password=payload.atv_password,
            environment=payload.environment
        )
        data = HaciendaTestConnectionResponse(
            success=True,
            environment=payload.environment,
            message="Conexión exitosa con el servidor IdP de Hacienda Costa Rica",
            token_type="bearer",
            expires_in=300
        )
        return StandardResponse(data=data, message="Conexión validada con IdP oficial")
    except Exception as e:
        data = HaciendaTestConnectionResponse(
            success=False,
            environment=payload.environment,
            message=f"Fallo de conexión con IdP de Hacienda: {str(e)}",
            token_type="",
            expires_in=0
        )
        return StandardResponse(
            data=data,
            success=False,
            message=f"No se pudo conectar con el IdP de Hacienda: {str(e)}"
        )

@router.post("/transmit", response_model=StandardResponse[HaciendaTransmitResponse])
async def transmit_to_hacienda(
    payload: HaciendaTransmitRequest,
    context: CurrentUserContext = Depends(require_permissions("invoicing:manage")),
    db: AsyncSession = Depends(get_db)
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")

    try:
        sale_uuid = uuid.UUID(payload.sale_id)
    except ValueError as exc:
        raise BadRequestException("Identificador de venta inválido") from exc

    # Find invoice for sale
    stmt = (
        select(ElectronicInvoice)
        .where(
            ElectronicInvoice.sale_id == sale_uuid,
            ElectronicInvoice.organization_id == context.organization_id,
            ElectronicInvoice.doc_type.in_(["01", "04"]),
        )
        .order_by(ElectronicInvoice.created_at.asc())
        .limit(1)
    )
    res = await db.execute(stmt)
    inv = res.scalar_one_or_none()
    if not inv:
        raise NotFoundException("Comprobante fiscal no encontrado para la venta")

    inv = await InvoiceService(db, context.organization_id).queue_invoice_for_transmission(inv.id)
    return StandardResponse(
        data=HaciendaTransmitResponse(
            invoice_id=str(inv.id),
            sale_id=str(sale_uuid),
            clave=inv.numeric_key,
            consecutive=inv.consecutive_number,
            status=inv.status,
            hacienda_status=inv.status,
            sent_at=inv.sent_to_hacienda_at.isoformat() if inv.sent_to_hacienda_at else "",
            message="Comprobante firmado y encolado para transmisión segura a Hacienda"
        ),
        message="Comprobante encolado; el estado final se actualizará con la respuesta oficial de Hacienda"
    )

@router.get("/{invoice_id}/status", response_model=StandardResponse[HaciendaStatusQueryResponse])
async def get_invoice_hacienda_status(
    invoice_id: uuid.UUID,
    context: CurrentUserContext = Depends(require_permissions("invoicing:read")),
    db: AsyncSession = Depends(get_db)
):
    service = ElectronicInvoicingService(db)
    result = await service.poll_invoice_status(
        invoice_id=invoice_id,
        organization_id=context.organization_id
    )

    data = HaciendaStatusQueryResponse(
        clave=result["clave"],
        status=result["status"],
        ind_estado=result["ind_estado"],
        mensaje_hacienda="Estado actualizado desde Hacienda",
        respuesta_xml=result.get("response_xml") or ""
    )
    return StandardResponse(data=data)
