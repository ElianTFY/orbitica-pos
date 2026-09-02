import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class HaciendaOutbox(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hacienda_outbox"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    branch_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("electronic_invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    numeric_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    consecutive_number: Mapped[str] = mapped_column(String(20), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(2), nullable=False)
    xml_uncompressed: Mapped[str] = mapped_column(Text, nullable=False)
    xml_signed: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)  # PENDING -> PROCESSING -> SENT -> ACCEPTED / REJECTED (or CONTINGENCY)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    hacienda_response_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hacienda_response_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
