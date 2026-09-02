import asyncio
import logging
import uuid
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.session import AsyncSessionLocal
from app.models.outbox import HaciendaOutbox
from app.models.invoice import ElectronicInvoice
from app.models.organization import Organization
from app.models.fiscal_credential import FiscalCredential
from app.services.fiscal_security_service import FiscalSecurityService
from app.services.hacienda_client import HaciendaAPIClient

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

        if not records:
            return 0

        for record in records:
            try:
                await self._process_record(db, record)
            except Exception as ex:
                logger.error(f"Error procesando outbox ID {record.id}: {ex}")
                record.retry_count += 1
                record.last_error = str(ex)

                if record.retry_count >= self.max_retries:
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

        await db.commit()
        return len(records)

    async def _process_record(self, db: AsyncSession, record: HaciendaOutbox) -> None:
        now = datetime.now(timezone.utc)

        # Step 1: PENDING / QUEUED / ERROR -> PROCESSING -> SENT
        if record.status in ("PENDING", "QUEUED", "ERROR"):
            record.status = "PROCESSING"
            await db.flush()

            org_stmt = select(Organization).where(Organization.id == record.organization_id)
            org_res = await db.execute(org_stmt)
            org = org_res.scalar_one_or_none()
            if not org:
                record.status = "ERROR"
                record.last_error = "Organización no encontrada"
                return

            client = self._custom_client
            if not client:
                cred_stmt = select(FiscalCredential).where(
                    FiscalCredential.organization_id == record.organization_id,
                    FiscalCredential.environment == org.atv_environment,
                    FiscalCredential.is_active == True
                )
                cred_res = await db.execute(cred_stmt)
                cred = cred_res.scalar_one_or_none()
                if not cred or not cred.encrypted_atv_username or not cred.encrypted_atv_password:
                    record.status = "ERROR"
                    record.last_error = "Credenciales ATV no configuradas para el emisor"
                    return

                atv_user = FiscalSecurityService.decrypt_data(cred.encrypted_atv_username)
                atv_pass = FiscalSecurityService.decrypt_data(cred.encrypted_atv_password)
                client = HaciendaAPIClient(environment=org.atv_environment)
                token_data = await client.get_access_token(atv_user, atv_pass)
                access_token = token_data.get("access_token", "")
            else:
                access_token = "mock_test_token"

            inv_stmt = select(ElectronicInvoice).where(ElectronicInvoice.id == record.invoice_id)
            inv_res = await db.execute(inv_stmt)
            inv = inv_res.scalar_one_or_none()

            rec_tax_id = inv.receiver_tax_id if inv else None
            rec_tax_type = inv.receiver_tax_id_type if inv else None

            em_tipo = org.identification_type.zfill(2)[:2] if org.identification_type.isdigit() else ("02" if org.identification_type == "JURIDICA" else "01")
            em_num = "".join(c for c in org.identification_number if c.isdigit())

            send_res = await client.send_invoice(
                token=access_token,
                clave=record.numeric_key,
                fecha=now.strftime("%Y-%m-%dT%H:%M:%S-06:00"),
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
                record.status = "REJECTED"
                record.last_error = f"Hacienda rechazó la recepción: {send_res.get('error')}"
                if inv:
                    inv.status = "REJECTED"
                    inv.hacienda_error_message = str(send_res.get("error"))
            else:
                raise ValueError(f"Fallo en transmisión a Hacienda: {send_res}")

        # Step 2: SENT -> Query Status -> ACCEPTED / REJECTED
        elif record.status in ("SENT", "PROCESSING"):
            client = self._custom_client
            if not client:
                org_stmt = select(Organization).where(Organization.id == record.organization_id)
                org_res = await db.execute(org_stmt)
                org = org_res.scalar_one_or_none()

                cred_stmt = select(FiscalCredential).where(
                    FiscalCredential.organization_id == record.organization_id,
                    FiscalCredential.environment == org.atv_environment,
                    FiscalCredential.is_active == True
                )
                cred_res = await db.execute(cred_stmt)
                cred = cred_res.scalar_one_or_none()
                atv_user = FiscalSecurityService.decrypt_data(cred.encrypted_atv_username)
                atv_pass = FiscalSecurityService.decrypt_data(cred.encrypted_atv_password)
                client = HaciendaAPIClient(environment=org.atv_environment)
                token_data = await client.get_access_token(atv_user, atv_pass)
                access_token = token_data.get("access_token", "")
            else:
                access_token = "mock_test_token"

            status_res = await client.check_status(token=access_token, clave=record.numeric_key)
            record.hacienda_response_code = status_res.get("status_code", 200)

            inv_stmt = select(ElectronicInvoice).where(ElectronicInvoice.id == record.invoice_id)
            inv_res = await db.execute(inv_stmt)
            inv = inv_res.scalar_one_or_none()

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

    async def run_loop(self, poll_interval_seconds: int = 5):
        self._running = True
        while self._running:
            try:
                async with AsyncSessionLocal() as session:
                    processed = await self.process_batch(session)
                    if processed == 0:
                        await asyncio.sleep(poll_interval_seconds)
            except Exception as ex:
                logger.error(f"Error en bucle de Outbox Worker: {ex}")
                await asyncio.sleep(poll_interval_seconds)

    def stop(self):
        self._running = False
