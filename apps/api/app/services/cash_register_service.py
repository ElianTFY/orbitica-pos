import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.cash_register import CashRegister, CashRegisterSession, CashMovement
from app.models.sale import Sale, SalePayment
from app.models.user import User
from app.models.branch import Branch, UserBranchAccess
from app.core.constants import UserRole, ROLE_PERMISSIONS
from app.schemas.cash_register import CashRegisterCreate, SessionOpenRequest, SessionCloseRequest, CashMovementCreate
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from app.services.audit_service import AuditService

class CashRegisterService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def authorize_branch(self, user_id: uuid.UUID, branch_id: uuid.UUID, *, lock_user=False) -> User:
        stmt = select(User).where(User.id == user_id, User.is_active == True)
        if lock_user:
            stmt = stmt.with_for_update()
        actor = (await self.db.execute(stmt)).scalar_one_or_none()
        if not actor or (actor.organization_id != self.organization_id and actor.role != UserRole.SUPERADMIN):
            raise ForbiddenException("Operador no autorizado para esta organización")
        if actor.role not in {UserRole.OWNER, UserRole.SUPERADMIN}:
            access = (await self.db.execute(select(UserBranchAccess).where(
                UserBranchAccess.user_id == user_id, UserBranchAccess.branch_id == branch_id,
            ))).scalar_one_or_none()
            if not access:
                raise ForbiddenException("El operador no tiene acceso a esta sucursal")
        return actor

    async def _locked_session(self, session_id: uuid.UUID, actor_id: uuid.UUID) -> CashRegisterSession:
        session = (await self.db.execute(select(CashRegisterSession).where(
            CashRegisterSession.id == session_id,
            CashRegisterSession.organization_id == self.organization_id,
        ).with_for_update())).scalar_one_or_none()
        if not session:
            raise NotFoundException("Sesión de caja no encontrada")
        actor = await self.authorize_branch(actor_id, session.branch_id)
        if session.opened_by_user_id != actor_id and not (
            {"*", "cash:view_all"} & set(ROLE_PERMISSIONS.get(actor.role, []))
        ):
            raise ForbiddenException("Solo puede operar su propio turno de caja")
        if session.status != "OPEN":
            raise ConflictException("La sesión de caja ya está cerrada")
        return session

    async def totals(self, session: CashRegisterSession) -> dict:
        # Cash received less change is what entered the drawer. Refunds are
        # explicit movements in the drawer that actually paid the customer.
        rows = (await self.db.execute(select(
            SalePayment.payment_method,
            func.sum(SalePayment.amount - SalePayment.change_returned),
        ).join(Sale, Sale.id == SalePayment.sale_id).where(
            Sale.organization_id == self.organization_id,
            Sale.cash_session_id == session.id,
            or_(Sale.status == "COMPLETED", (Sale.status == "REFUNDED") & select(CashMovement.id).where(
                CashMovement.reference_sale_id == Sale.id,
            ).exists()),
        ).group_by(SalePayment.payment_method))).all()
        amounts = dict(rows)
        def total(*methods):
            return sum((amounts.get(m) or Decimal("0.00") for m in methods), Decimal("0.00"))
        movements = dict((await self.db.execute(select(
            CashMovement.movement_type, func.sum(CashMovement.amount),
        ).where(
            CashMovement.cash_session_id == session.id,
            CashMovement.organization_id == self.organization_id,
        ).group_by(CashMovement.movement_type))).all())
        cash = total("CASH_CRC", "CASH")
        inflows = movements.get("INFLOW", Decimal("0.00"))
        outflows = movements.get("OUTFLOW", Decimal("0.00"))
        return dict(cash_sales=cash, card_sales=total("CARD", "CREDIT_CARD", "DEBIT_CARD"),
                    sinpe_sales=total("SINPE", "SINPE_MOVIL"), total_sales=sum(amounts.values(), Decimal("0.00")),
                    cash_inflows=inflows, cash_outflows=outflows,
                    expected_cash_amount=session.initial_cash_amount + cash + inflows - outflows)

    async def add_movement(self, session_id: uuid.UUID, data: CashMovementCreate, actor_id: uuid.UUID) -> CashMovement:
        session = await self._locked_session(session_id, actor_id)
        if data.movement_type == "OUTFLOW" and data.amount > (await self.totals(session))["expected_cash_amount"]:
            raise BadRequestException("El retiro excede el efectivo esperado en caja")
        movement = CashMovement(organization_id=self.organization_id, branch_id=session.branch_id,
                                cash_session_id=session.id, user_id=actor_id, **data.model_dump())
        self.db.add(movement)
        await self.db.flush()
        await AuditService.log_action(db=self.db, action="CASH_MOVEMENT_CREATED", resource="CashMovement",
            actor_id=actor_id, organization_id=self.organization_id, branch_id=session.branch_id,
            resource_id=str(movement.id), payload_after=data.model_dump(mode="json"))
        await self.db.commit()
        await self.db.refresh(movement)
        return movement

    async def list_registers(self, branch_id: Optional[uuid.UUID] = None) -> List[CashRegister]:
        stmt = select(CashRegister).where(
            CashRegister.organization_id == self.organization_id,
            CashRegister.is_active == True
        )
        if branch_id:
            stmt = stmt.where(CashRegister.branch_id == branch_id)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_register(self, data: CashRegisterCreate) -> CashRegister:
        # Validate branch belongs to organization
        branch_stmt = select(Branch).where(
            Branch.id == data.branch_id,
            Branch.organization_id == self.organization_id
        )
        branch_res = await self.db.execute(branch_stmt)
        if not branch_res.scalar_one_or_none():
            raise NotFoundException("Sucursal no válida para la organización")

        reg = CashRegister(
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            name=data.name.strip(),
            pos_terminal_number=data.pos_terminal_number
        )
        self.db.add(reg)
        await self.db.commit()
        await self.db.refresh(reg)
        return reg

    async def open_session(self, data: SessionOpenRequest, user_id: uuid.UUID) -> CashRegisterSession:
        # Fetch register and verify organization
        reg_stmt = select(CashRegister).where(
            CashRegister.id == data.cash_register_id,
            CashRegister.organization_id == self.organization_id,
            CashRegister.is_active == True
        ).with_for_update()
        reg_res = await self.db.execute(reg_stmt)
        reg = reg_res.scalar_one_or_none()
        if not reg:
            raise NotFoundException("Caja registradora no encontrada")

        # Lock the operator as well: two different registers cannot open two
        # simultaneous shifts for the same person.
        await self.authorize_branch(user_id, reg.branch_id, lock_user=True)
        active_stmt = select(CashRegisterSession).where(
            or_(CashRegisterSession.cash_register_id == data.cash_register_id,
                CashRegisterSession.opened_by_user_id == user_id),
            CashRegisterSession.status == "OPEN"
        )
        active_res = await self.db.execute(active_stmt)
        if active_res.first():
            raise ConflictException("La caja o el operador ya tiene un turno abierto")

        session = CashRegisterSession(
            organization_id=self.organization_id,
            branch_id=reg.branch_id,
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
            branch_id=reg.branch_id,
            resource_id=str(session.id),
            payload_after={"initial_cash": str(data.initial_cash_amount)}
        )

        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_active_session(self, user_id: Optional[uuid.UUID] = None) -> Optional[dict]:
        stmt = (
            select(CashRegisterSession, User.full_name)
            .join(User, CashRegisterSession.opened_by_user_id == User.id)
            .where(
                CashRegisterSession.organization_id == self.organization_id,
                CashRegisterSession.status == "OPEN",
            )
        )
        if user_id:
            stmt = stmt.where(CashRegisterSession.opened_by_user_id == user_id)

        res = await self.db.execute(stmt)
        row = res.first()
        if not row:
            return None

        session, u_name = row
        totals = await self.totals(session)

        return {
            "id": session.id,
            "cash_register_id": session.cash_register_id,
            "branch_id": session.branch_id,
            "opened_by_user_id": session.opened_by_user_id,
            "closed_by_user_id": session.closed_by_user_id,
            "user_name": u_name,
            "opened_at": session.opened_at,
            "closed_at": session.closed_at,
            "initial_cash_amount": session.initial_cash_amount,
            "actual_cash_amount": session.actual_cash_amount,
            **totals,
            "cash_difference": session.cash_difference,
            "status": session.status,
            "notes": session.notes
        }

    async def close_session(self, session_id: uuid.UUID, data: SessionCloseRequest, actor_id: uuid.UUID) -> CashRegisterSession:
        session = await self._locked_session(session_id, actor_id)
        expected_total = (await self.totals(session))["expected_cash_amount"]
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
            branch_id=session.branch_id,
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
