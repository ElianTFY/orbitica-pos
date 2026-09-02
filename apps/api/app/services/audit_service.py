import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.audit_log import AuditLog

GENESIS_HASH = "0" * 64

def format_audit_time(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

def canonical_hash_event(
    timestamp_str: str,
    org_id_str: str,
    actor_id_str: str,
    action: str,
    resource: str,
    resource_id: str,
    previous_hash: str,
    payload_before: Optional[dict],
    payload_after: Optional[dict]
) -> str:
    raw_dict = {
        "timestamp": timestamp_str,
        "org_id": org_id_str,
        "actor_id": actor_id_str,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "previous_hash": previous_hash,
        "payload_before": payload_before,
        "payload_after": payload_after
    }
    canonical_json = json.dumps(raw_dict, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        action: str,
        resource: str,
        actor_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        branch_id: Optional[uuid.UUID] = None,
        resource_id: Optional[str] = None,
        reason: Optional[str] = None,
        request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        step_up_token: Optional[str] = None,
        payload_before: Optional[Dict[str, Any]] = None,
        payload_after: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        # 1. Fetch last audit log to get previous_hash
        last_stmt = (
            select(AuditLog.event_hash)
            .order_by(desc(AuditLog.created_at))
            .limit(1)
        )
        last_res = await db.execute(last_stmt)
        last_hash = last_res.scalar_one_or_none() or GENESIS_HASH

        now_dt = datetime.now(timezone.utc)
        time_str = format_audit_time(now_dt)

        # 2. Compute canonical event hash
        ev_hash = canonical_hash_event(
            timestamp_str=time_str,
            org_id_str=str(organization_id) if organization_id else "",
            actor_id_str=str(actor_id) if actor_id else "",
            action=action,
            resource=resource,
            resource_id=resource_id or "",
            previous_hash=last_hash,
            payload_before=payload_before,
            payload_after=payload_after
        )

        audit_entry = AuditLog(
            organization_id=organization_id,
            branch_id=branch_id,
            actor_id=actor_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            reason=reason,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
            step_up_token=step_up_token,
            payload_before=payload_before,
            payload_after=payload_after,
            previous_hash=last_hash,
            event_hash=ev_hash,
            created_at=now_dt
        )
        db.add(audit_entry)
        await db.flush()
        return audit_entry

    @staticmethod
    async def verify_audit_chain(
        db: AsyncSession,
        limit: int = 500
    ) -> Tuple[bool, int, Optional[str]]:
        """
        Verifies the cryptographic integrity of the audit log chain.
        Returns: (is_valid, verified_count, error_message_if_broken)
        """
        stmt = select(AuditLog).order_by(AuditLog.created_at.asc()).limit(limit)
        res = await db.execute(stmt)
        logs: List[AuditLog] = list(res.scalars().all())

        if not logs:
            return True, 0, None

        expected_prev_hash = GENESIS_HASH
        for idx, entry in enumerate(logs):
            if idx == 0:
                expected_prev_hash = entry.previous_hash or GENESIS_HASH
            else:
                if entry.previous_hash != expected_prev_hash:
                    return (
                        False,
                        idx,
                        f"Ruptura de cadena en evento ID '{entry.id}': previous_hash esperado '{expected_prev_hash}', obtenido '{entry.previous_hash}'"
                    )

            # Recalculate event hash
            time_str = format_audit_time(entry.created_at)
            recomputed = canonical_hash_event(
                timestamp_str=time_str,
                org_id_str=str(entry.organization_id) if entry.organization_id else "",
                actor_id_str=str(entry.actor_id) if entry.actor_id else "",
                action=entry.action,
                resource=entry.resource,
                resource_id=entry.resource_id or "",
                previous_hash=entry.previous_hash or GENESIS_HASH,
                payload_before=entry.payload_before,
                payload_after=entry.payload_after
            )
            if recomputed != entry.event_hash:
                return (
                    False,
                    idx,
                    f"Firma de evento alterada en ID '{entry.id}': hash recomputado '{recomputed}' no coincide con '{entry.event_hash}'"
                )

            expected_prev_hash = entry.event_hash

        return True, len(logs), None

    # Alias for integrity verification
    verify_chain_integrity = verify_audit_chain
