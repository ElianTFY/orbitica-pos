import base64
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.invoice import ElectronicInvoice
from app.security.deps import CurrentUserContext, require_permissions
from app.schemas.common import StandardResponse
from app.schemas.hacienda import (
    HaciendaCredentialsInput,
    HaciendaCredentialsResponse,
    HaciendaTestConnectionResponse,
    HaciendaTransmitRequest,
    HaciendaTransmitResponse,
    HaciendaStatusQueryResponse
)
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.electronic_invoicing_service import ElectronicInvoicingService
from app.infrastructure.external.hacienda_api_client import HaciendaAPIClient
from app.core.exceptions import NotFoundException, BadRequestException

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
            p12_bytes = base64.b64decode(payload.p12_base64)
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

    creds = await FiscalSecurityService.get_decrypted_credentials(
        db=db,
        organization_id=context.organization_id,
        environment="STAGING"
    )
    if not creds:
        data = HaciendaCredentialsResponse(
            environment="STAGING",
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

@router.post("/test-connection", response_model=StandardResponse[HaciendaTestConnectionResponse])
async def test_hacienda_connection(
    payload: HaciendaCredentialsInput,
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

    service = ElectronicInvoicingService(db)
    sale_uuid = uuid.UUID(payload.sale_id)

    # Find invoice for sale
    stmt = select(ElectronicInvoice).where(
        ElectronicInvoice.sale_id == sale_uuid,
        ElectronicInvoice.organization_id == context.organization_id
    )
    res = await db.execute(stmt)
    inv = res.scalar_one_or_none()
    if not inv:
        raise NotFoundException("Comprobante fiscal no encontrado para la venta")

    result = await service.transmit_invoice_to_hacienda(
        invoice_id=inv.id,
        organization_id=context.organization_id
    )
    return StandardResponse(
        data=HaciendaTransmitResponse(
            invoice_id=result["invoice_id"],
            sale_id=str(sale_uuid),
            clave=result["clave"],
            consecutive=inv.consecutive_number,
            status=result["status"],
            hacienda_status=result["status"],
            sent_at=inv.sent_to_hacienda_at.isoformat() if inv.sent_to_hacienda_at else "",
            message=result["message"] or "Comprobante transmitido al Ministerio de Hacienda"
        ),
        message="Transmisión a Hacienda completada"
    )

@router.get("/{invoice_id}/status", response_model=StandardResponse[HaciendaStatusQueryResponse])
async def get_invoice_hacienda_status(
    invoice_id: str,
    context: CurrentUserContext = Depends(require_permissions("invoicing:read")),
    db: AsyncSession = Depends(get_db)
):
    inv_uuid = uuid.UUID(invoice_id)
    service = ElectronicInvoicingService(db)
    result = await service.poll_invoice_status(
        invoice_id=inv_uuid,
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
