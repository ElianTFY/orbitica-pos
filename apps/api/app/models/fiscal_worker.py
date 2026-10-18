"""Durable liveness for the process that delivers fiscal documents."""
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin


class FiscalWorkerHeartbeat(Base, UUIDMixin):
    __tablename__ = "fiscal_worker_heartbeats"
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
