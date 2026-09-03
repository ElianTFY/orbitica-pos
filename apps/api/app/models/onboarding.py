import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, GUID

class OrganizationOnboarding(Base, UUIDMixin):
    __tablename__ = "organization_onboarding"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    current_step: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    business_data_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fiscal_data_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    branches_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    payments_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    products_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    contacts_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    users_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="onboarding")
