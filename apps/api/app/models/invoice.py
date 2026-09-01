import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Text, ForeignKey, DateTime
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
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )
    doc_type: Mapped[str] = mapped_column(String(2), nullable=False)  # 01=FE, 04=TE, 03=NC, 02=ND
    numeric_key: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    consecutive_number: Mapped[str] = mapped_column(String(20), nullable=False)
    environment: Mapped[str] = mapped_column(String(20), default="STAGING", nullable=False)
    
    # Financial amounts
    currency: Mapped[str] = mapped_column(String(3), default="CRC", nullable=False)
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("1.0000"), nullable=False)
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    
    # Status Machine: DRAFT, SIGNED, SENT, PROCESSING, ACCEPTED, REJECTED, ERROR
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)
    
    # Receiver Info
    receiver_tax_id_type: Mapped[str | None] = mapped_column(String(2), nullable=True)
    receiver_tax_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    receiver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receiver_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # References for Credit / Debit Notes
    reference_doc_type: Mapped[str | None] = mapped_column(String(2), nullable=True)
    reference_numeric_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reference_code: Mapped[str | None] = mapped_column(String(2), nullable=True)  # 01=Anula, 02=Corrige texto, 03=Corrige monto
    reference_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # XML Storage
    xml_generated: Mapped[str | None] = mapped_column(Text, nullable=True)
    xml_signed: Mapped[str | None] = mapped_column(Text, nullable=True)
    hacienda_response_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
    hacienda_status_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    hacienda_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    sent_to_hacienda_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hacienda_processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
