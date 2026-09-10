import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class ConsecutiveSequence(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "consecutive_sequences"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    branch_code: Mapped[str] = mapped_column(String(3), default="001", nullable=False)
    terminal_number: Mapped[str] = mapped_column(String(5), default="00001", nullable=False)
    doc_type: Mapped[str] = mapped_column(String(2), nullable=False)  # 01=FE, 04=TE, 03=NC, 02=ND
    environment: Mapped[str] = mapped_column(String(20), default="STAGING", nullable=False)
    current_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "branch_code", "terminal_number", "doc_type", "environment",
            name="uq_consecutive_seq_org_branch_term_type_env"
        ),
    )
