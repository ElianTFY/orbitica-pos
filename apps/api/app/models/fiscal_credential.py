import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, ForeignKey, DateTime, UniqueConstraint, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class FiscalCredential(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fiscal_credentials"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    environment: Mapped[str] = mapped_column(String(20), default="STAGING", nullable=False)
    encrypted_p12: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet encrypted base64
    encrypted_pin: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet encrypted
    encrypted_atv_username: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet encrypted
    encrypted_atv_password: Mapped[str | None] = mapped_column(Text, nullable=True)  # Fernet encrypted
    
    certificate_expiration: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    certificate_issuer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    certificate_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "environment", name="uq_fiscal_cred_org_env"),
    )
