import uuid
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from app.models.idempotency import IdempotencyRecord
from app.core.exceptions import ConflictException

class IdempotencyService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    @staticmethod
    def compute_request_hash(payload: str | bytes | dict) -> str:
        if isinstance(payload, dict):
            raw = json.dumps(payload, sort_keys=True)
        elif isinstance(payload, str):
            raw = payload
        else:
            raw = payload.decode("utf-8", errors="ignore")
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def start_or_get_idempotent_operation(
        self,
        operation: str,
        idempotency_key: str,
        request_hash: str,
        ttl_minutes: int = 10
    ) -> Tuple[bool, Optional[IdempotencyRecord]]:
        """
        Returns (is_cached, record).
        If is_cached is True: record.response_payload contains the cached JSON response.
        If is_cached is False: a new IN_PROGRESS lock was acquired and the operation should execute.
        """
        if not idempotency_key or len(idempotency_key) > 255:
            raise ConflictException("Clave de idempotencia inválida")
        if self.db.get_bind().dialect.name == "postgresql":
            # Covers the first insert as well as retries; lock lives until the
            # sale AND its cached response have committed in one transaction.
            lock_key = int.from_bytes(hashlib.sha256(
                f"{self.organization_id}:{operation}:{idempotency_key}".encode()
            ).digest()[:8], byteorder="big", signed=True)
            await self.db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})
        stmt = select(IdempotencyRecord).where(
            IdempotencyRecord.organization_id == self.organization_id,
            IdempotencyRecord.operation == operation,
            IdempotencyRecord.idempotency_key == idempotency_key,
        ).with_for_update()
        record = (await self.db.execute(stmt)).scalar_one_or_none()
        if record:
            if record.request_hash != request_hash:
                raise ConflictException("La clave de idempotencia fue utilizada previamente con un payload diferente.")
            if record.status == "COMPLETED":
                return True, record
            # Older versions committed IN_PROGRESS before the sale; never
            # reclaim those blindly because a sale may already exist.
            raise ConflictException("Operación pendiente de conciliación. Consulte soporte antes de repetir el cobro.")

        new_record = IdempotencyRecord(
            organization_id=self.organization_id, operation=operation,
            idempotency_key=idempotency_key, request_hash=request_hash,
            status="IN_PROGRESS",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        )
        try:
            self.db.add(new_record)
            await self.db.flush()
        except IntegrityError:
            await self.db.rollback()
            record = (await self.db.execute(stmt)).scalar_one_or_none()
            if record and record.request_hash == request_hash and record.status == "COMPLETED":
                return True, record
            raise ConflictException("Conflicto con otra solicitud que utiliza la misma clave")
        return False, new_record

    async def complete_idempotent_operation(
        self,
        operation: str,
        idempotency_key: str,
        response_payload: str,
        status_code: int = 200
    ) -> None:
        stmt = select(IdempotencyRecord).where(
            IdempotencyRecord.organization_id == self.organization_id,
            IdempotencyRecord.operation == operation,
            IdempotencyRecord.idempotency_key == idempotency_key
        )
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()
        if record:
            record.status = "COMPLETED"
            record.response_payload = response_payload
            record.status_code = status_code
            await self.db.commit()
