import uuid
from decimal import Decimal
from sqlalchemy import String, Boolean, Numeric, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin, GUID

class Category(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_org_category_name"),
    )

class TaxRate(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tax_rates"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code_cr: Mapped[str] = mapped_column(String(10), default="01", nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("13.00"), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

class Product(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True
    )
    tax_rate_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("tax_rates.id", ondelete="RESTRICT"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    
    # Costa Rica Fiscal v4.4 Fields
    cabys_code: Mapped[str] = mapped_column(String(13), default="0000000000000", nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(10), default="Unid", nullable=False)
    
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0.0000"), nullable=False)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0.0000"), nullable=False)
    min_stock_alert: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("5.00"), nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_service: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "sku", name="uq_org_sku"),
        UniqueConstraint("organization_id", "barcode", name="uq_org_barcode"),
    )

class BranchProductStock(Base):
    __tablename__ = "branch_product_stocks"

    branch_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("branches.id", ondelete="CASCADE"),
        primary_key=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
