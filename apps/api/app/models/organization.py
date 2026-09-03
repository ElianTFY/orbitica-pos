import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    legal_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    trade_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    identification_type: Mapped[str] = mapped_column(String(20), default="02", nullable=False)  # 01=Fisica, 02=Juridica, 03=DIMEX, 04=NITE
    identification_number: Mapped[str | None] = mapped_column(String(30), nullable=True, unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    country_code: Mapped[str] = mapped_column(String(2), default="CR", nullable=False)
    default_currency: Mapped[str] = mapped_column(String(3), default="CRC", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Costa Rica Fiscal Info v4.4
    economic_activity_code: Mapped[str] = mapped_column(String(10), default="521101", nullable=False)
    province_code: Mapped[str] = mapped_column(String(2), default="1", nullable=False)
    canton_code: Mapped[str] = mapped_column(String(2), default="01", nullable=False)
    district_code: Mapped[str] = mapped_column(String(2), default="01", nullable=False)
    neighborhood_code: Mapped[str | None] = mapped_column(String(2), default="01", nullable=True)
    address_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_regime: Mapped[str] = mapped_column(String(30), default="TRADICIONAL", nullable=False)
    atv_environment: Mapped[str] = mapped_column(String(20), default="STAGING", nullable=False)

    branches: Mapped[list["Branch"]] = relationship("Branch", back_populates="organization", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    memberships: Mapped[list["OrganizationMembership"]] = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")
    subscription: Mapped["Subscription | None"] = relationship("Subscription", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    onboarding: Mapped["OrganizationOnboarding | None"] = relationship("OrganizationOnboarding", back_populates="organization", uselist=False, cascade="all, delete-orphan")

class OrganizationMembership(Base, UUIDMixin):
    __tablename__ = "organization_memberships"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    role: Mapped[str] = mapped_column(String(50), default="OWNER", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_user_org_membership"),
    )

    user: Mapped["User"] = relationship("User", back_populates="memberships")
    organization: Mapped["Organization"] = relationship("Organization", back_populates="memberships")
