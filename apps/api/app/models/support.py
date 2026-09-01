import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, ForeignKey, DateTime, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class SupportTicket(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "support_tickets"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    assigned_to_user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="OTHER", nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    telemetry_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    messages: Mapped[list["SupportMessage"]] = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")

class SupportMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "support_messages"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # CLIENT, SUPPORT_AGENT, SYSTEM
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal_note: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    ticket: Mapped["SupportTicket"] = relationship("SupportTicket", back_populates="messages")

class DelegatedAccessGrant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "delegated_access_grants"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    granted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    support_agent_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    permission_level: Mapped[str] = mapped_column(String(30), default="READ_ONLY", nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
