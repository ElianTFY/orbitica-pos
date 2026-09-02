import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin, GUID

class Supplier(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "suppliers"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    identification_type: Mapped[str] = mapped_column(String(20), default="02", nullable=False)  # 01=Fisica, 02=Juridica, etc.
    identification_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    purchases: Mapped[list["Purchase"]] = relationship("Purchase", back_populates="supplier")

    __table_args__ = (
        UniqueConstraint("organization_id", "identification_number", name="uq_org_supplier_ident"),
    )
