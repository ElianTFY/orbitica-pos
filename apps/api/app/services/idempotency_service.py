import uuid
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
        stmt = select(IdempotencyRecord).where(
            IdempotencyRecord.organization_id == self.organization_id,
            IdempotencyRecord.operation == operation,
            IdempotencyRecord.idempotency_key == idempotency_key
        ).with_for_update()
        
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if record:
            if record.status == "COMPLETED":
                if record.request_hash != request_hash:
                    raise ConflictException("La clave de idempotencia fue utilizada previamente con un payload diferente.")
                return True, record
            elif record.status == "IN_PROGRESS":
                if record.expires_at > now:
                    raise ConflictException("La operación solicitada está actualmente en procesamiento. Intente nuevamente en breve.")
                # Lock expired, allow takeover
                record.request_hash = request_hash
                record.expires_at = now + timedelta(minutes=ttl_minutes)
                record.status = "IN_PROGRESS"
                await self.db.commit()
                return False, record

        # Create new record with atomic collision handling
        try:
            new_record = IdempotencyRecord(
                organization_id=self.organization_id,
                operation=operation,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                status="IN_PROGRESS",
                expires_at=now + timedelta(minutes=ttl_minutes)
            )
            self.db.add(new_record)
            await self.db.commit()
            return False, new_record
        except Exception:
            await self.db.rollback()
            # A concurrent transaction inserted the record simultaneously! Re-query with lock:
            retry_stmt = select(IdempotencyRecord).where(
                IdempotencyRecord.organization_id == self.organization_id,
                IdempotencyRecord.operation == operation,
                IdempotencyRecord.idempotency_key == idempotency_key
            ).with_for_update()
            retry_res = await self.db.execute(retry_stmt)
            collided = retry_res.scalar_one_or_none()
            if collided:
                if collided.status == "COMPLETED":
                    if collided.request_hash != request_hash:
                        raise ConflictException("La clave de idempotencia fue utilizada previamente con un payload diferente.")
                    return True, collided
                elif collided.status == "IN_PROGRESS":
                    raise ConflictException("La operación solicitada está actualmente en procesamiento por otra solicitud concurrente.")
            raise ConflictException("Conflicto de concurrencia al registrar la clave de idempotencia.")

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
