import asyncio
import logging
import signal
import uuid
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.session import AsyncSessionLocal, async_engine, sync_engine
from app.models.outbox import HaciendaOutbox
from app.models.invoice import ElectronicInvoice
from app.models.organization import Organization
from app.models.fiscal_credential import FiscalCredential
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.hacienda_client import HaciendaAPIClient
from app.services.email_service import FiscalEmailService
from app.core.config import settings
from app.core.logging import setup_logging

logger = logging.getLogger("hacienda_worker")

class HaciendaOutboxWorker:
    def __init__(
        self,
        batch_size: int = 10,
        max_retries: int = 5,
        base_backoff_seconds: int = 5,
        max_backoff_seconds: int = 300,
        hacienda_client: Optional[HaciendaAPIClient] = None
    ):
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.base_backoff_seconds = base_backoff_seconds
        self.max_backoff_seconds = max_backoff_seconds
        self._custom_client = hacienda_client
        self._running = False
        self._stop_event = asyncio.Event()

    async def process_batch(self, db: AsyncSession) -> int:
        """
        Pulls a batch of pending/retryable outbox records using SELECT ... FOR UPDATE SKIP LOCKED.
        Processes each record according to the strict lifecycle:
        PENDING -> PROCESSING -> SENT -> ACCEPTED / REJECTED (or CONTINGENCY on exhaustion).
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(HaciendaOutbox)
            .where(
                HaciendaOutbox.status.in_(["PENDING", "QUEUED", "PROCESSING", "SENT", "ERROR"]),
                or_(
                    HaciendaOutbox.next_retry_at.is_(None),
                    HaciendaOutbox.next_retry_at <= now
                )
            )
            .order_by(HaciendaOutbox.created_at.asc())
            .limit(self.batch_size)
            .with_for_update(skip_locked=True)
        )
        res = await db.execute(stmt)
        records = list(res.scalars().all())

        for record in records:
            try:
                await self._process_record(db, record)
            except Exception as ex:
                logger.error(f"Error procesando outbox ID {record.id}: {ex}")
                record.retry_count += 1
                record.last_error = str(ex)

                inv = (await db.execute(
                    select(ElectronicInvoice).where(ElectronicInvoice.id == record.invoice_id)
                )).scalar_one_or_none()
                already_received = bool(inv and inv.sent_to_hacienda_at)

                if already_received:
                    backoff = min(
                        self.max_backoff_seconds,
                        (2 ** min(record.retry_count, self.max_retries)) * self.base_backoff_seconds,
                    )
                    record.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=backoff)
                    record.status = "SENT"
                    if inv:
                        inv.status = "PROCESSING"
                elif record.retry_count >= self.max_retries:
                    # Activate Fiscal Contingency when Hacienda is unreachable
                    record.status = "CONTINGENCY"
                    record.last_error = f"Contingencia fiscal activada: Hacienda no disponible tras {self.max_retries} reintentos ({str(ex)})"
                    logger.warning(
                        f"Outbox ID {record.id} superó {self.max_retries} reintentos. "
                        "Activada contingencia fiscal DGT para comprobante "
                        f"{record.numeric_key}."
                    )
                    inv_stmt = select(ElectronicInvoice).where(ElectronicInvoice.id == record.invoice_id)
                    inv_res = await db.execute(inv_stmt)
                    inv = inv_res.scalar_one_or_none()
                    if inv:
                        inv.status = "CONTINGENCY"
                        inv.hacienda_error_message = f"Contingencia fiscal: Hacienda no disponible tras {self.max_retries} intentos ({str(ex)})"
                else:
                    backoff = min(
                        self.max_backoff_seconds,
                        (2 ** record.retry_count) * self.base_backoff_seconds
                    )
                    record.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=backoff)
                    record.status = "PENDING"

        email_retries = await self._retry_pending_emails(
            db,
            exclude_invoice_ids={record.invoice_id for record in records},
        )
        await db.commit()
        return len(records) + email_retries

    async def _process_record(self, db: AsyncSession, record: HaciendaOutbox) -> None:
        now = datetime.now(timezone.utc)

        inv = (await db.execute(
            select(ElectronicInvoice).where(ElectronicInvoice.id == record.invoice_id)
        )).scalar_one_or_none()
        org = (await db.execute(
            select(Organization).where(Organization.id == record.organization_id)
        )).scalar_one_or_none()

        fiscal_environment = inv.environment if inv else (org.atv_environment if org else "STAGING")

        # A durable receipt timestamp means Hacienda already received this key.
        # Never transmit it again, even if a recovery routine changed the outbox
        # status after a worker crash.
        if inv and inv.sent_to_hacienda_at and record.status in {"PENDING", "QUEUED", "PROCESSING", "ERROR"}:
            record.status = "SENT"

        # A worker can crash after marking PROCESSING but before sending. If no
        # durable sent marker exists, resume the transmission branch.
        if record.status == "PROCESSING" and (not inv or not inv.sent_to_hacienda_at):
            record.status = "PENDING"

        # Step 1: PENDING / QUEUED / ERROR -> PROCESSING -> SENT
        if record.status in ("PENDING", "QUEUED", "ERROR"):
            if fiscal_environment == "PRODUCTION" and (
                not settings.HACIENDA_SANDBOX_VALIDATED
                or not settings.HACIENDA_LIVE_EMISSION_ENABLED
            ):
                raise ValueError(
                    "Transmisión bloqueada: la emisión en vivo requiere Sandbox validado y habilitación explícita"
                )
            record.status = "PROCESSING"
            await db.flush()

            if not org:
                raise ValueError("Organización no encontrada")

            client = self._custom_client
            if not client:
                cred_stmt = select(FiscalCredential).where(
                    FiscalCredential.organization_id == record.organization_id,
                    FiscalCredential.environment == fiscal_environment,
                    FiscalCredential.is_active == True
                )
                cred_res = await db.execute(cred_stmt)
                cred = cred_res.scalar_one_or_none()
                if not cred or not cred.encrypted_atv_username or not cred.encrypted_atv_password:
                    raise ValueError("Credenciales ATV no configuradas para el emisor")

                atv_user = FiscalSecurityService.decrypt_data(cred.encrypted_atv_username)
                atv_pass = FiscalSecurityService.decrypt_data(cred.encrypted_atv_password)
                client = HaciendaAPIClient(environment=fiscal_environment)
                token_data = await client.get_access_token(atv_user, atv_pass)
                access_token = token_data.get("access_token", "")
            else:
                access_token = "mock_test_token"

            rec_tax_id = inv.receiver_tax_id if inv else None
            rec_tax_type = inv.receiver_tax_id_type if inv else None

            em_tipo = org.identification_type.zfill(2)[:2] if org.identification_type.isdigit() else ("02" if org.identification_type == "JURIDICA" else "01")
            em_num = "".join(c for c in org.identification_number if c.isdigit())

            send_res = await client.send_invoice(
                token=access_token,
                clave=record.numeric_key,
                fecha=(inv.created_at if inv and inv.created_at else now)
                    .replace(tzinfo=(inv.created_at.tzinfo if inv and inv.created_at and inv.created_at.tzinfo else timezone.utc))
                    .astimezone(timezone(timedelta(hours=-6)))
                    .isoformat(),
                emisor_id=em_num,
                emisor_tipo=em_tipo,
                signed_xml=record.xml_signed,
                receptor_id=rec_tax_id,
                receptor_tipo=rec_tax_type
            )
            record.hacienda_response_code = send_res.get("status_code", 202)

            if send_res.get("success", False) or record.hacienda_response_code in (200, 201, 202):
                # Successfully received by Hacienda API -> Transition to SENT
                record.status = "SENT"
                record.next_retry_at = now + timedelta(seconds=2)
                if inv:
                    inv.status = "PROCESSING"
                    inv.sent_to_hacienda_at = now
            elif record.hacienda_response_code == 400:
                error_text = str(send_res.get("error") or "")
                normalized_error = error_text.lower()
                duplicate_key = "clave" in normalized_error and any(
                    marker in normalized_error
                    for marker in ("recibid", "registrad", "existe", "duplic")
                )
                if duplicate_key:
                    # A previous attempt may have reached Hacienda before the
                    # worker persisted its receipt marker. Poll the existing
                    # key and never transmit the XML again.
                    record.status = "SENT"
                    record.next_retry_at = now + timedelta(seconds=2)
                    record.last_error = "Clave ya recibida por Hacienda; se continuará consultando su estado"
                    if inv:
                        inv.status = "PROCESSING"
                        inv.sent_to_hacienda_at = inv.sent_to_hacienda_at or now
                else:
                    record.status = "REJECTED"
                    record.last_error = f"Hacienda rechazó la recepción: {error_text}"
                    if inv:
                        inv.status = "REJECTED"
                        inv.hacienda_error_message = error_text
            else:
                raise ValueError(f"Fallo en transmisión a Hacienda: {send_res}")

        # Step 2: SENT -> Query Status -> ACCEPTED / REJECTED
        elif record.status in ("SENT", "PROCESSING"):
            client = self._custom_client
            if not client:
                if not org:
                    raise ValueError("Organización no encontrada")

                cred_stmt = select(FiscalCredential).where(
                    FiscalCredential.organization_id == record.organization_id,
                    FiscalCredential.environment == fiscal_environment,
                    FiscalCredential.is_active == True
                )
                cred_res = await db.execute(cred_stmt)
                cred = cred_res.scalar_one_or_none()
                if not cred or not cred.encrypted_atv_username or not cred.encrypted_atv_password:
                    raise ValueError("Credenciales ATV no configuradas para consultar el comprobante")
                atv_user = FiscalSecurityService.decrypt_data(cred.encrypted_atv_username)
                atv_pass = FiscalSecurityService.decrypt_data(cred.encrypted_atv_password)
                client = HaciendaAPIClient(environment=fiscal_environment)
                token_data = await client.get_access_token(atv_user, atv_pass)
                access_token = token_data.get("access_token", "")
            else:
                access_token = "mock_test_token"

            status_res = await client.check_status(token=access_token, clave=record.numeric_key)
            record.hacienda_response_code = status_res.get("status_code", 200)

            h_status = str(status_res.get("status", "")).lower()
            resp_xml = status_res.get("response_xml")
            if resp_xml:
                record.hacienda_response_xml = resp_xml

            if h_status == "aceptado":
                record.status = "ACCEPTED"
                if inv:
                    inv.status = "ACCEPTED"
                    inv.hacienda_status_code = "aceptado"
                    inv.hacienda_response_xml = resp_xml
                    inv.hacienda_processed_at = now
                    if inv.receiver_email and not inv.email_sent_at:
                        await self._send_fiscal_email(inv, org, now)
            elif h_status == "rechazado":
                record.status = "REJECTED"
                record.last_error = f"Comprobante rechazado por Hacienda: {status_res.get('error')}"
                if inv:
                    inv.status = "REJECTED"
                    inv.hacienda_status_code = "rechazado"
                    inv.hacienda_response_xml = resp_xml
                    inv.hacienda_processed_at = now
            else:
                # Still processing at Hacienda; check again in 5 seconds
                record.next_retry_at = now + timedelta(seconds=5)

    @staticmethod
    def _document_name(doc_type: str) -> str:
        return {
            "01": "Factura Electrónica",
            "02": "Nota de Débito Electrónica",
            "03": "Nota de Crédito Electrónica",
            "04": "Tiquete Electrónico",
        }.get(doc_type, "Comprobante Electrónico")

    async def _send_fiscal_email(
        self,
        invoice: ElectronicInvoice,
        organization: Organization,
        now: datetime,
    ) -> bool:
        sent = await FiscalEmailService().send_invoice_email(
            to_email=invoice.receiver_email or "",
            issuer_name=organization.trade_name or organization.legal_name,
            customer_name=invoice.receiver_name or "Cliente",
            consecutive_number=invoice.consecutive_number,
            numeric_key=invoice.numeric_key,
            total_amount=invoice.total_amount,
            currency=invoice.currency,
            signed_xml=invoice.xml_signed or "",
            hacienda_response_xml=invoice.hacienda_response_xml,
            doc_type_name=self._document_name(invoice.doc_type),
        )
        invoice.email_retry_count += 1
        if sent:
            invoice.email_sent_at = now
            invoice.email_delivery_error = None
        else:
            invoice.email_delivery_error = "No se pudo entregar el correo fiscal; se reintentará automáticamente"
        return sent

    async def _retry_pending_emails(
        self,
        db: AsyncSession,
        exclude_invoice_ids: Optional[Set[uuid.UUID]] = None,
    ) -> int:
        query = select(ElectronicInvoice).where(
                ElectronicInvoice.status == "ACCEPTED",
                ElectronicInvoice.receiver_email.is_not(None),
                ElectronicInvoice.email_sent_at.is_(None),
                ElectronicInvoice.email_retry_count < self.max_retries,
            )
        if exclude_invoice_ids:
            query = query.where(ElectronicInvoice.id.notin_(exclude_invoice_ids))
        invoices = list((await db.execute(
            query.order_by(ElectronicInvoice.updated_at.asc()).limit(self.batch_size)
        )).scalars().all())

        attempted = 0
        now = datetime.now(timezone.utc)
        for invoice in invoices:
            organization = (await db.execute(
                select(Organization).where(Organization.id == invoice.organization_id)
            )).scalar_one_or_none()
            if not organization:
                invoice.email_retry_count += 1
                invoice.email_delivery_error = "Organización emisora no encontrada"
                attempted += 1
                continue
            await self._send_fiscal_email(invoice, organization, now)
            attempted += 1
        return attempted

    async def run_loop(self, poll_interval_seconds: int = 5):
        self._running = True
        self._stop_event.clear()
        while self._running:
            idle = False
            try:
                async with AsyncSessionLocal() as session:
                    processed = await self.process_batch(session)
                    idle = processed == 0
            except Exception as ex:
                logger.error(f"Error en bucle de Outbox Worker: {ex}")
                idle = True
            if idle and self._running:
                try:
                    await asyncio.wait_for(self._stop_event.wait(), timeout=poll_interval_seconds)
                except asyncio.TimeoutError:
                    pass

    def stop(self):
        self._running = False
        self._stop_event.set()


async def main() -> None:
    setup_logging()
    settings.validate_production_readiness()
    worker = HaciendaOutboxWorker()
    loop = asyncio.get_running_loop()
    registered = []
    for stop_signal in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(stop_signal, worker.stop)
            registered.append(stop_signal)
        except NotImplementedError:
            pass  # add_signal_handler is unavailable on Windows event loops.
    logger.info("Hacienda worker iniciado; esperando comprobantes pendientes")
    try:
        # SIGTERM stops fetching new batches and lets the current transaction
        # finish before Render replaces this process.
        await worker.run_loop()
    finally:
        for stop_signal in registered:
            loop.remove_signal_handler(stop_signal)
        await async_engine.dispose()
        sync_engine.dispose()
        logger.info("Hacienda worker detenido")


if __name__ == "__main__":
    asyncio.run(main())
