import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, GUID

class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Audit Security & Forensic Hashing
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    step_up_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    payload_before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    payload_after: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    # Chained Cryptographic Verification (SHA-256)
    previous_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
