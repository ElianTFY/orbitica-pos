import base64
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.invoice import ElectronicInvoice
from app.models.organization import Organization
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
from app.services.hacienda_client import HaciendaAPIClient
from app.services.fiscal_readiness import fiscal_readiness_report
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
        atv_username=payload.atv_username.strip(),
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
        atv_username=payload.atv_username.strip(),
        has_certificate=bool(cred.encrypted_p12),
        is_active=cred.is_active,
        status_message="Credenciales y certificado criptográfico cifrados y guardados exitosamente"
    )
    return StandardResponse(data=data, message="Configuración fiscal guardada")

@router.get("/credentials", response_model=StandardResponse[HaciendaCredentialsResponse])
async def get_hacienda_credentials_status(
    environment: Optional[Literal["STAGING", "PRODUCTION"]] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db),
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")
    org = (await db.execute(select(Organization).where(Organization.id == context.organization_id))).scalar_one()
    selected_environment = environment or org.atv_environment
    cred = await FiscalSecurityService.get_credential_record(db, org.id, selected_environment)
    username, readable = "", True
    if cred and cred.encrypted_atv_username:
        try:
            username = FiscalSecurityService.decrypt_data(cred.encrypted_atv_username)
        except Exception:
            readable = False
    active = bool(cred and cred.is_active and readable)
    return StandardResponse(data=HaciendaCredentialsResponse(
        environment=selected_environment, atv_username=username,
        has_certificate=bool(cred and cred.encrypted_p12), is_active=active,
        certificate_expires_at=cred.certificate_expiration if cred else None,
        connection_tested_at=cred.connection_tested_at if cred else None,
        connection_test_success=cred.connection_test_success if cred else None,
        status_message=("No se pueden abrir las credenciales guardadas; revisa la configuración de cifrado del servidor"
                        if not readable else "Credenciales guardadas para este ambiente" if active
                        else "No se han configurado credenciales fiscales para este ambiente"),
    ))


@router.get("/readiness", response_model=StandardResponse[Dict[str, Any]])
async def get_hacienda_readiness(
    environment: Optional[Literal["STAGING", "PRODUCTION"]] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("invoicing:read")),
    db: AsyncSession = Depends(get_db),
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")
    org = (await db.execute(select(Organization).where(Organization.id == context.organization_id))).scalar_one()
    return StandardResponse(data=await fiscal_readiness_report(db, org, environment or org.atv_environment))


@router.post("/test-connection", response_model=StandardResponse[HaciendaTestConnectionResponse])
async def test_hacienda_connection(
    payload: HaciendaConnectionTestInput,
    context: CurrentUserContext = Depends(require_permissions("org:update")),
    db: AsyncSession = Depends(get_db),
):
    if not context.organization_id:
        raise BadRequestException("Usuario sin organización")
    stored = payload.atv_username is None
    cred = None
    if stored:
        cred = await FiscalSecurityService.get_credential_record(db, context.organization_id, payload.environment)
        if not cred or not cred.is_active or not cred.encrypted_atv_username or not cred.encrypted_atv_password:
            raise BadRequestException("Guarda las credenciales de este ambiente antes de probar la conexión")
        # Detect simultaneous replacement without holding a lock over network I/O.
        version = (cred.encrypted_atv_username, cred.encrypted_atv_password, cred.encrypted_p12, cred.encrypted_pin)
    token_data = {}
    try:
        username = FiscalSecurityService.decrypt_data(cred.encrypted_atv_username) if stored else payload.atv_username
        password = FiscalSecurityService.decrypt_data(cred.encrypted_atv_password) if stored else payload.atv_password
        token_data = await HaciendaAPIClient(environment=payload.environment).get_access_token(username, password)
        success = bool(token_data.get("access_token"))
    except Exception:
        # Never expose IdP bodies, passwords or access tokens in UI/audit.
        success = False
    message = ("Hacienda autenticó las credenciales guardadas. Esta prueba no emite ni valida un comprobante."
               if success and stored else "Hacienda autenticó los datos ingresados. Guárdalos y prueba las credenciales guardadas para registrar la verificación."
               if success else "No fue posible autenticar con Hacienda. Revisa el ambiente, el usuario y la contraseña API; si son correctos, vuelve a intentar.")
    if stored:
        await db.refresh(cred, with_for_update=True)
        current_version = (cred.encrypted_atv_username, cred.encrypted_atv_password, cred.encrypted_p12, cred.encrypted_pin)
        if current_version != version or not cred.is_active:
            raise BadRequestException("Las credenciales cambiaron durante la prueba; valida nuevamente")
        cred.connection_tested_at = datetime.now(timezone.utc)
        cred.connection_test_success = success
        await AuditService.log_action(
            db=db, action="HACIENDA_CONNECTION_TESTED", resource="FiscalCredential",
            actor_id=context.user_id, organization_id=context.organization_id, resource_id=str(cred.id),
            payload_after={"environment": payload.environment, "success": success},
        )
        await db.commit()
    return StandardResponse(success=success, message=message, data=HaciendaTestConnectionResponse(
        success=success, environment=payload.environment, message=message,
        token_type=token_data.get("token_type") if success else None,
        expires_in=token_data.get("expires_in") if success else None,
    ))

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
