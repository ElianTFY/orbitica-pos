import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Numeric, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, GUID

class CashRegister(Base, UUIDMixin):
    __tablename__ = "cash_registers"

    branch_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    pos_terminal_number: Mapped[str] = mapped_column(String(10), default="00001", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class CashRegisterSession(Base, UUIDMixin):
    __tablename__ = "cash_register_sessions"

    cash_register_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("cash_registers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    opened_by_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True
    )
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    initial_cash_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    expected_cash_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    actual_cash_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    cash_difference: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False)
