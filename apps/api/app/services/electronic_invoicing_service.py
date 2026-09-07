import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.models.sale import Sale
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.hacienda_xml_generator_v44 import HaciendaXMLGeneratorV44
from app.services.xades_signer_v44 import XAdESSignerV44
from app.infrastructure.external.hacienda_api_client import HaciendaAPIClient
from app.services.audit_service import AuditService
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.config import settings

class ElectronicInvoicingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def prepare_and_sign_invoice(
        self,
        invoice_id: uuid.UUID,
        organization_id: uuid.UUID
    ) -> ElectronicInvoice:
        stmt = (
            select(ElectronicInvoice)
            .options(
                selectinload(ElectronicInvoice.sale).selectinload(Sale.items),
                selectinload(ElectronicInvoice.sale).selectinload(Sale.payments),
            )
            .where(
                ElectronicInvoice.id == invoice_id,
                ElectronicInvoice.organization_id == organization_id
            )
        )
        res = await self.db.execute(stmt)
        invoice = res.scalar_one_or_none()
        if not invoice:
            raise NotFoundException("Factura electrónica no encontrada")

        org_res = await self.db.execute(select(Organization).where(Organization.id == organization_id))
        org = org_res.scalar_one_or_none()
        if not org:
            raise NotFoundException("Organización no encontrada")

        provider_id = "".join(c for c in settings.SOFTWARE_PROVIDER_TAX_ID if c.isdigit())
        if not provider_id or provider_id == "3101000000":
            raise BadRequestException("Debe configurar la identificación real del proveedor de sistemas antes de firmar comprobantes")
        if not (org.economic_activity_code and len(org.economic_activity_code) == 6 and org.economic_activity_code.isdigit()):
            raise BadRequestException("La actividad económica del emisor debe contener 6 dígitos")
        if not all([org.province_code, org.canton_code, org.district_code, org.address_detail]):
            raise BadRequestException("La ubicación fiscal del emisor está incompleta")

        branch_res = await self.db.execute(select(Branch).where(
            Branch.id == invoice.branch_id,
            Branch.organization_id == organization_id,
        ))
        branch = branch_res.scalar_one_or_none()

        customer = None
        if invoice.sale and invoice.sale.customer_id:
            cust_res = await self.db.execute(select(Customer).where(
                Customer.id == invoice.sale.customer_id,
                Customer.organization_id == organization_id,
            ))
            customer = cust_res.scalar_one_or_none()

        # 1. Fetch encrypted credentials
        creds = await FiscalSecurityService.get_decrypted_credentials(
            db=self.db,
            organization_id=organization_id,
            environment=invoice.environment
        )
        if not creds or not creds.get("p12_bytes") or not creds.get("pin"):
            raise BadRequestException("No se han configurado certificado criptográfico .p12 y PIN fiscal válidos")

        # 2. Generate XML v4.4
        ref_info = None
        if invoice.doc_type in ["02", "03"] and invoice.reference_numeric_key:
            ref_info = {
                "doc_type": invoice.reference_doc_type or "01",
                "number": invoice.reference_numeric_key,
                "date": invoice.reference_date.isoformat() if invoice.reference_date else datetime.now(timezone.utc).isoformat(),
                "code": invoice.reference_code or "01",
                "reason": invoice.reference_reason or "Anulación de documento"
            }

        raw_xml = HaciendaXMLGeneratorV44.generate_xml(
            doc_type=invoice.doc_type,
            numeric_key=invoice.numeric_key,
            consecutive_number=invoice.consecutive_number,
            sale=invoice.sale,
            org=org,
            branch=branch,
            customer=customer,
            reference_info=ref_info,
            emission_date=invoice.created_at,
        )
        invoice.xml_generated = raw_xml

        # 3. Cryptographically Sign with XAdES-EPES v1.3.2
        signed_xml = XAdESSignerV44.sign_xml(
            xml_content=raw_xml,
            p12_bytes=creds["p12_bytes"],
            pin=creds["pin"]
        )
        invoice.xml_signed = signed_xml
        invoice.status = "SIGNED"

        # Keep signing inside the caller's transaction. The sale/refund and its
        # outbox record must commit atomically.
        await self.db.flush()
        return invoice

    async def transmit_invoice_to_hacienda(
        self,
        invoice_id: uuid.UUID,
        organization_id: uuid.UUID
    ) -> Dict[str, Any]:
        # All transmissions must pass through the durable outbox. Keeping this
        # compatibility method prevents callers from bypassing retries,
        # idempotency and the production emission guard.
        from app.services.invoice_service import InvoiceService

        invoice = await InvoiceService(
            self.db,
            organization_id,
        ).queue_invoice_for_transmission(invoice_id)
        return {
            "invoice_id": str(invoice.id),
            "clave": invoice.numeric_key,
            "status": invoice.status,
            "message": "Comprobante firmado y encolado para transmisión segura",
        }

    async def poll_invoice_status(
        self,
        invoice_id: uuid.UUID,
        organization_id: uuid.UUID
    ) -> Dict[str, Any]:
        outbox = (await self.db.execute(
            select(HaciendaOutbox).where(
                HaciendaOutbox.invoice_id == invoice_id,
                HaciendaOutbox.organization_id == organization_id,
            ).with_for_update()
        )).scalar_one_or_none()
        stmt = select(ElectronicInvoice).where(
            ElectronicInvoice.id == invoice_id,
            ElectronicInvoice.organization_id == organization_id
        ).with_for_update()
        res = await self.db.execute(stmt)
        invoice = res.scalar_one_or_none()
        if not invoice:
            raise NotFoundException("Factura electrónica no encontrada")

        if invoice.status in {"ACCEPTED", "REJECTED"}:
            return {
                "invoice_id": str(invoice.id), "clave": invoice.numeric_key,
                "status": invoice.status, "ind_estado": invoice.hacienda_status_code,
                "response_xml": invoice.hacienda_response_xml,
                "error_message": invoice.hacienda_error_message,
            }
        if not invoice.sent_to_hacienda_at:
            raise BadRequestException("El comprobante todavía no tiene constancia de envío a Hacienda")

        creds = await FiscalSecurityService.get_decrypted_credentials(
            db=self.db,
            organization_id=organization_id,
            environment=invoice.environment
        )
        if not creds or not creds.get("username") or not creds.get("password"):
            raise BadRequestException("Credenciales de usuario API de Hacienda no configuradas")

        client = HaciendaAPIClient()
        token = await client.get_oauth_token(
            username=creds["username"],
            password=creds["password"],
            environment=invoice.environment
        )

        status_result = await client.query_document_status(
            token=token,
            numeric_key=invoice.numeric_key,
            environment=invoice.environment
        )

        ind_estado = status_result.get("ind_estado", "").lower()
        now = datetime.now(timezone.utc)

        if ind_estado == "aceptado":
            invoice.status = "ACCEPTED"
            invoice.hacienda_processed_at = now
            invoice.hacienda_status_code = "200"
            invoice.hacienda_response_xml = status_result.get("response_xml")
        elif ind_estado == "rechazado":
            invoice.status = "REJECTED"
            invoice.hacienda_processed_at = now
            invoice.hacienda_status_code = "400"
            invoice.hacienda_response_xml = status_result.get("response_xml")
            invoice.hacienda_error_message = status_result.get("raw_response", {}).get("detalle-mensaje", "Comprobante rechazado por Hacienda")
        else:
            invoice.status = "PROCESSING"

        if outbox:
            outbox.status = invoice.status if invoice.status in {"ACCEPTED", "REJECTED"} else "SENT"
            outbox.hacienda_response_xml = invoice.hacienda_response_xml
            if invoice.status == "REJECTED":
                outbox.last_error = invoice.hacienda_error_message

        await AuditService.log_action(
            db=self.db,
            action="INVOICE_STATUS_POLLED",
            resource="ElectronicInvoice",
            organization_id=organization_id,
            resource_id=str(invoice.id),
            payload_after={"clave": invoice.numeric_key, "ind_estado": ind_estado, "status": invoice.status}
        )

        await self.db.commit()
        return {
            "invoice_id": str(invoice.id),
            "clave": invoice.numeric_key,
            "status": invoice.status,
            "ind_estado": ind_estado,
            "response_xml": invoice.hacienda_response_xml,
            "error_message": invoice.hacienda_error_message
        }
