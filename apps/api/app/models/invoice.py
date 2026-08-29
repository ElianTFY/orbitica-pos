import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class ElectronicInvoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "electronic_invoices"

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
    sale_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    doc_type: Mapped[str] = mapped_column(String(20), nullable=False)
    numeric_key: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    consecutive_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)
    xml_generated_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    xml_signed_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    hacienda_response_xml_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    hacienda_status_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    hacienda_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_to_hacienda_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hacienda_processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
