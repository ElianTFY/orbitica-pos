import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.cash_register import CashRegister, CashRegisterSession
from app.models.sale import Sale, SalePayment
from app.models.user import User
from app.schemas.cash_register import CashRegisterCreate, SessionOpenRequest, SessionCloseRequest
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.services.audit_service import AuditService

class CashRegisterService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_registers(self, branch_id: Optional[uuid.UUID] = None) -> List[CashRegister]:
        stmt = select(CashRegister).where(CashRegister.is_active == True)
        if branch_id:
            stmt = stmt.where(CashRegister.branch_id == branch_id)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_register(self, data: CashRegisterCreate) -> CashRegister:
        reg = CashRegister(
            branch_id=data.branch_id,
            name=data.name.strip(),
            pos_terminal_number=data.pos_terminal_number
        )
        self.db.add(reg)
        await self.db.commit()
        await self.db.refresh(reg)
        return reg

    async def open_session(self, data: SessionOpenRequest, user_id: uuid.UUID) -> CashRegisterSession:
        active_stmt = select(CashRegisterSession).where(
            CashRegisterSession.cash_register_id == data.cash_register_id,
            CashRegisterSession.status == "OPEN"
        )
        active_res = await self.db.execute(active_stmt)
        if active_res.scalar_one_or_none():
            raise ConflictException("Esta caja registradora ya tiene un turno abierto")

        session = CashRegisterSession(
            cash_register_id=data.cash_register_id,
            opened_by_user_id=user_id,
            initial_cash_amount=data.initial_cash_amount,
            status="OPEN",
            notes=data.notes
        )
        self.db.add(session)
        await self.db.flush()

        await AuditService.log_action(
            db=self.db,
            action="CASH_SESSION_OPENED",
            resource="CashRegisterSession",
            actor_id=user_id,
            organization_id=self.organization_id,
            resource_id=str(session.id),
            payload_after={"initial_cash": str(data.initial_cash_amount)}
        )

        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_active_session(self, user_id: Optional[uuid.UUID] = None) -> Optional[dict]:
        stmt = select(CashRegisterSession, User.full_name).join(
            User, CashRegisterSession.opened_by_user_id == User.id
        ).where(
            CashRegisterSession.status == "OPEN"
        )
        if user_id:
            stmt = stmt.where(CashRegisterSession.opened_by_user_id == user_id)

        res = await self.db.execute(stmt)
        row = res.first()
        if not row:
            return None

        session, u_name = row
        sales_stmt = select(Sale.id).where(
            Sale.cash_session_id == session.id,
            Sale.status == "COMPLETED"
        )
        sales_res = await self.db.execute(sales_stmt)
        sale_ids = list(sales_res.scalars().all())

        sales_cash = Decimal("0.00")
        if sale_ids:
            p_stmt = select(func.sum(SalePayment.amount)).where(
                SalePayment.sale_id.in_(sale_ids),
                SalePayment.payment_method == "CASH_CRC"
            )
            p_res = await self.db.execute(p_stmt)
            sales_cash = p_res.scalar_one() or Decimal("0.00")

        expected_cash = session.initial_cash_amount + sales_cash

        return {
            "id": session.id,
            "cash_register_id": session.cash_register_id,
            "opened_by_user_id": session.opened_by_user_id,
            "closed_by_user_id": session.closed_by_user_id,
            "user_name": u_name,
            "opened_at": session.opened_at,
            "closed_at": session.closed_at,
            "initial_cash_amount": session.initial_cash_amount,
            "actual_cash_amount": session.actual_cash_amount,
            "expected_cash_amount": expected_cash,
            "cash_difference": session.cash_difference,
            "status": session.status,
            "notes": session.notes
        }

    async def close_session(self, session_id: uuid.UUID, data: SessionCloseRequest, actor_id: uuid.UUID) -> CashRegisterSession:
        stmt = select(CashRegisterSession).where(CashRegisterSession.id == session_id)
        res = await self.db.execute(stmt)
        session = res.scalar_one_or_none()

        if not session:
            raise NotFoundException("Sesión de caja no encontrada")

        if session.status != "OPEN":
            raise ConflictException(f"La sesión ya se encuentra con estado '{session.status}'")

        sales_stmt = select(Sale.id).where(
            Sale.cash_session_id == session.id,
            Sale.status == "COMPLETED"
        )
        sales_res = await self.db.execute(sales_stmt)
        sale_ids = list(sales_res.scalars().all())

        sales_cash = Decimal("0.00")
        if sale_ids:
            p_stmt = select(func.sum(SalePayment.amount)).where(
                SalePayment.sale_id.in_(sale_ids),
                SalePayment.payment_method == "CASH_CRC"
            )
            p_res = await self.db.execute(p_stmt)
            sales_cash = p_res.scalar_one() or Decimal("0.00")

        expected_total = session.initial_cash_amount + sales_cash
        difference = data.actual_cash_amount - expected_total

        session.closed_by_user_id = actor_id
        session.closed_at = datetime.now(timezone.utc)
        session.actual_cash_amount = data.actual_cash_amount
        session.expected_cash_amount = expected_total
        session.cash_difference = difference
        session.status = "CLOSED"
        session.notes = data.notes

        await AuditService.log_action(
            db=self.db,
            action="CASH_SESSION_CLOSED",
            resource="CashRegisterSession",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(session.id),
            payload_after={
                "actual": str(data.actual_cash_amount),
                "expected": str(expected_total),
                "difference": str(difference)
            }
        )

        await self.db.commit()
        await self.db.refresh(session)
        return session
