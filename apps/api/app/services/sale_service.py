import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.models.sale import Sale, SaleItem, SalePayment
from app.models.catalog import Product, TaxRate, BranchProductStock
from app.models.inventory import InventoryMovement
from app.models.invoice import ElectronicInvoice
from app.models.outbox import HaciendaOutbox
from app.models.organization import Organization
from app.models.branch import Branch, UserBranchAccess
from app.models.user import User
from app.core.constants import UserRole
from app.models.cash_register import CashRegister, CashRegisterSession
from app.schemas.sale import SaleCreate, RefundRequest
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from app.services.consecutive_service import ConsecutiveService
from app.services.audit_service import AuditService
from app.services.hacienda_xml_generator_v44 import map_tax_rate_code
from app.services.electronic_invoicing_service import ElectronicInvoicingService
from app.services.outbox_service import OutboxService

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class SaleService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def create_sale(self, data: SaleCreate, user_id: uuid.UUID, *, commit: bool = True) -> Sale:
        # 1. Fetch organization & branch
        org_stmt = select(Organization).where(Organization.id == self.organization_id)
        org_res = await self.db.execute(org_stmt)
        org = org_res.scalar_one_or_none()
        if not org:
            raise NotFoundException("Organización no encontrada")

        branch_stmt = select(Branch).where(
            Branch.id == data.branch_id,
            Branch.organization_id == self.organization_id
        )
        branch_res = await self.db.execute(branch_stmt)
        branch = branch_res.scalar_one_or_none()
        if not branch:
            raise NotFoundException("Sucursal no válida para la organización")

        actor = (await self.db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not actor:
            raise ForbiddenException("Operador no encontrado")
        if actor.role not in {UserRole.OWNER, UserRole.SUPERADMIN}:
            permitted = (await self.db.execute(select(UserBranchAccess.branch_id).where(
                UserBranchAccess.user_id == user_id, UserBranchAccess.branch_id == data.branch_id,
            ))).scalar_one_or_none()
            if not permitted:
                raise ForbiddenException("El operador no tiene acceso a esta sucursal")

        # 2. Validate Cash Session if provided
        terminal_number = "00001"
        if data.cash_session_id:
            sess_stmt = select(CashRegisterSession).where(
                CashRegisterSession.id == data.cash_session_id,
                CashRegisterSession.organization_id == self.organization_id,
                CashRegisterSession.branch_id == data.branch_id,
                CashRegisterSession.status == "OPEN"
            )
            sess_res = await self.db.execute(sess_stmt)
            cash_sess = sess_res.scalar_one_or_none()
            if not cash_sess:
                raise BadRequestException("La sesión de caja especificada no está abierta o no pertenece a esta sucursal")
            
            reg_stmt = select(CashRegister).where(CashRegister.id == cash_sess.cash_register_id)
            reg_res = await self.db.execute(reg_stmt)
            reg = reg_res.scalar_one_or_none()
            if reg:
                terminal_number = reg.pos_terminal_number

        # 3. Determine Document Type (01=Factura if customer tax id provided, 04=Tiquete if not)
        doc_type = "04"
        cust = None
        if data.customer_id:
            from app.models.customer import Customer
            cust_stmt = select(Customer).where(
                Customer.id == data.customer_id,
                Customer.organization_id == self.organization_id
            )
            cust_res = await self.db.execute(cust_stmt)
            cust = cust_res.scalar_one_or_none()
            if not cust:
                raise NotFoundException("Cliente no encontrado en la organización")
            if cust and cust.identification_number:
                doc_type = "01"

        # 4. Generate Consecutive Atomically using SELECT ... FOR UPDATE
        consec_service = ConsecutiveService(self.db)
        consecutive_int = await consec_service.get_next_consecutive_atomic(
            organization_id=self.organization_id,
            branch_code=branch.code,
            terminal_number=terminal_number,
            doc_type=doc_type,
            environment=org.atv_environment
        )

        consecutivo_20 = ConsecutiveService.build_consecutivo_20(
            branch_code=branch.code,
            terminal_number=terminal_number,
            doc_type=doc_type,
            consecutive_int=consecutive_int
        )
        now_dt = datetime.now(timezone.utc)
        clave_50, sec_code = ConsecutiveService.build_clave_50(
            emitter_tax_id=org.identification_number,
            consecutivo_20=consecutivo_20,
            doc_date=now_dt,
            situation="1"
        )
        sale_number = f"V-{org.atv_environment}-{consecutivo_20}"

        # 5. Process items, calculate taxes & lock stock with SELECT ... FOR UPDATE
        total_subtotal = Decimal("0.00")
        total_discount = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_final = Decimal("0.00")

        sale_items = []
        ledger_movements = []

        for item_in in data.items:
            # Query product with TaxRate
            p_stmt = (
                select(Product, TaxRate.rate)
                .join(TaxRate, Product.tax_rate_id == TaxRate.id)
                .where(
                    Product.id == item_in.product_id,
                    Product.organization_id == self.organization_id,
                    Product.is_active == True,
                )
            )
            p_res = await self.db.execute(p_stmt)
            row = p_res.first()
            if not row:
                raise NotFoundException(f"Producto ID '{item_in.product_id}' no encontrado o inactivo")
            prod, tax_rate_val = row

            # Deduct stock with FOR UPDATE if physical product
            if not prod.is_service:
                stk_stmt = (
                    select(BranchProductStock)
                    .where(
                        BranchProductStock.branch_id == data.branch_id,
                        BranchProductStock.product_id == prod.id,
                    )
                    .with_for_update()
                )
                stk_res = await self.db.execute(stk_stmt)
                stk_rec = stk_res.scalar_one_or_none()

                curr_qty = stk_rec.quantity if stk_rec else Decimal("0.00")
                if curr_qty < item_in.quantity:
                    raise BadRequestException(
                        f"Stock insuficiente para '{prod.name}'. Disponible: {curr_qty}, Solicitado: {item_in.quantity}"
                    )

                new_qty = curr_qty - item_in.quantity
                if stk_rec:
                    stk_rec.quantity = new_qty
                else:
                    stk_rec = BranchProductStock(branch_id=data.branch_id, product_id=prod.id, quantity=new_qty)
                    self.db.add(stk_rec)

                ledger_movements.append((prod.id, item_in.quantity, curr_qty, new_qty))

            # Calculations
            unit_price = prod.sale_price
            gross_line = round_money(unit_price * item_in.quantity)
            disc_amount = round_money(gross_line * (item_in.discount_percentage / Decimal("100.00")))
            net_line_with_tax = gross_line - disc_amount

            # Base amount without IVA: net / (1 + rate/100)
            base_amount = round_money(net_line_with_tax / (Decimal("1.00") + (tax_rate_val / Decimal("100.00"))))
            line_tax = round_money(net_line_with_tax - base_amount)

            total_subtotal += base_amount
            total_discount += disc_amount
            total_tax += line_tax
            total_final += net_line_with_tax

            cod_imp, cod_tarifa = map_tax_rate_code(tax_rate_val)

            sale_items.append(
                SaleItem(
                    product_id=prod.id,
                    product_name=prod.name,
                    product_sku=prod.sku,
                    cabys_code=prod.cabys_code,
                    unit_of_measure=prod.unit_of_measure,
                    tax_rate_code=cod_tarifa,
                    is_service=prod.is_service,
                    price_includes_tax=True,
                    quantity=item_in.quantity,
                    unit_price=prod.sale_price,
                    unit_cost=prod.cost_price,
                    discount_percentage=item_in.discount_percentage,
                    discount_amount=disc_amount,
                    tax_rate=tax_rate_val,
                    tax_amount=line_tax,
                    line_total=net_line_with_tax
                )
            )

        # 6. Process Payments
        paid_sum = sum(p.amount for p in data.payments)
        if paid_sum < total_final:
            raise BadRequestException(f"Monto de pago ({paid_sum}) es menor que el total de la venta ({total_final})")

        change_calc = max(Decimal("0.00"), paid_sum - total_final)
        cash_paid = sum((p.amount for p in data.payments if p.payment_method.startswith("CASH")), Decimal("0.00"))
        if change_calc > cash_paid:
            raise BadRequestException("El sobrepago solo puede devolverse del efectivo recibido")

        sale_payments = []
        remaining_change = change_calc
        for p_in in data.payments:
            payment_change = min(remaining_change, p_in.amount) if p_in.payment_method.startswith("CASH") else Decimal("0.00")
            remaining_change -= payment_change
            sale_payments.append(
                SalePayment(
                    payment_method=p_in.payment_method,
                    amount=p_in.amount,
                    change_returned=payment_change,
                    reference_number=p_in.reference_number
                )
            )

        # 7. Create Sale Header
        sale = Sale(
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            cash_session_id=data.cash_session_id,
            customer_id=data.customer_id,
            user_id=user_id,
            sale_number=sale_number,
            currency=data.currency,
            subtotal_amount=total_subtotal,
            discount_amount=total_discount,
            tax_amount=total_tax,
            total_amount=total_final,
            status="COMPLETED",
            notes=data.notes,
            items=sale_items,
            payments=sale_payments
        )
        self.db.add(sale)
        await self.db.flush()

        # 8. Insert Ledger movements
        for prod_id, qty, prev_q, new_q in ledger_movements:
            mov = InventoryMovement(
                organization_id=self.organization_id,
                branch_id=data.branch_id,
                product_id=prod_id,
                actor_id=user_id,
                movement_type="OUT_SALE",
                quantity=-qty,
                previous_quantity=prev_q,
                new_quantity=new_q,
                reference_id=sale.id,
                reason=f"Venta POS #{sale_number} (Doc {doc_type})"
            )
            self.db.add(mov)

        # 9. Create Electronic Invoice Record v4.4 in DRAFT
        inv = ElectronicInvoice(
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            sale_id=sale.id,
            doc_type=doc_type,
            numeric_key=clave_50,
            consecutive_number=consecutivo_20,
            environment=org.atv_environment,
            currency=data.currency,
            subtotal_amount=total_subtotal,
            discount_amount=total_discount,
            tax_amount=total_tax,
            total_amount=total_final,
            receiver_tax_id_type=cust.identification_type if cust else None,
            receiver_tax_id=cust.identification_number if cust else None,
            receiver_name=cust.name if cust else None,
            receiver_email=cust.email if cust else None,
            status="DRAFT"
        )
        self.db.add(inv)

        await AuditService.log_action(
            db=self.db,
            action="SALE_COMPLETED",
            resource="Sale",
            actor_id=user_id,
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            resource_id=str(sale.id),
            payload_after={"sale_number": sale.sale_number, "total": str(sale.total_amount), "clave": clave_50}
        )

        if commit:
            await self.db.commit()
        else:
            await self.db.flush()
        stmt = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.payments)
        ).where(Sale.id == sale.id)
        res = await self.db.execute(stmt)
        return res.scalar_one()

    async def refund_sale(self, sale_id: uuid.UUID, data: RefundRequest, actor_id: uuid.UUID, *, commit: bool = True) -> Sale:
        stmt = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.payments)
        ).where(
            Sale.id == sale_id,
            Sale.organization_id == self.organization_id
        ).with_for_update()
        res = await self.db.execute(stmt)
        sale = res.scalar_one_or_none()

        if not sale:
            raise NotFoundException("Venta no encontrada")

        if sale.status == "REFUNDED":
            raise ConflictException("Esta venta ya ha sido devuelta / reembolsada")

        if sale.status != "COMPLETED":
            raise BadRequestException(f"No se puede devolver una venta con estado '{sale.status}'")

        original_invoice = (await self.db.execute(
            select(ElectronicInvoice)
            .where(
                ElectronicInvoice.sale_id == sale.id,
                ElectronicInvoice.organization_id == self.organization_id,
                ElectronicInvoice.doc_type.in_(["01", "04"]),
            )
            .order_by(ElectronicInvoice.created_at.asc())
            .limit(1)
            .with_for_update()
        )).scalar_one_or_none()

        original_outbox = None
        if original_invoice:
            original_outbox = (await self.db.execute(
                select(HaciendaOutbox)
                .where(HaciendaOutbox.invoice_id == original_invoice.id)
                .with_for_update()
            )).scalar_one_or_none()

            uncertain_delivery = (
                original_outbox
                and original_outbox.status in {"PROCESSING", "SENT"}
            ) or original_invoice.status in {"PROCESSING", "SENT"}
            if uncertain_delivery:
                raise ConflictException(
                    "La factura está en proceso en Hacienda. Consulte el estado antes de devolverla para evitar inconsistencias fiscales."
                )

        # Load items to return stock
        items_stmt = select(SaleItem).where(SaleItem.sale_id == sale.id)
        items_res = await self.db.execute(items_stmt)
        items = list(items_res.scalars().all())

        for item in items:
            if item.is_service:
                continue
            stk_stmt = (
                select(BranchProductStock)
                .where(
                    BranchProductStock.branch_id == sale.branch_id,
                    BranchProductStock.product_id == item.product_id,
                )
                .with_for_update()
            )
            stk_res = await self.db.execute(stk_stmt)
            stk_rec = stk_res.scalar_one_or_none()

            prev_q = stk_rec.quantity if stk_rec else Decimal("0.00")
            new_q = prev_q + item.quantity

            if stk_rec:
                stk_rec.quantity = new_q
            else:
                stk_rec = BranchProductStock(branch_id=sale.branch_id, product_id=item.product_id, quantity=new_q)
                self.db.add(stk_rec)

            mov = InventoryMovement(
                organization_id=self.organization_id,
                branch_id=sale.branch_id,
                product_id=item.product_id,
                actor_id=actor_id,
                movement_type="RETURN_IN",
                quantity=item.quantity,
                previous_quantity=prev_q,
                new_quantity=new_q,
                reference_id=sale.id,
                reason=f"Devolución venta #{sale.sale_number}: {data.reason}"
            )
            self.db.add(mov)

        credit_note = None
        if original_invoice:
            if original_invoice.status == "ACCEPTED":
                org = (await self.db.execute(
                    select(Organization).where(Organization.id == self.organization_id)
                )).scalar_one()
                branch = (await self.db.execute(
                    select(Branch).where(
                        Branch.id == sale.branch_id,
                        Branch.organization_id == self.organization_id,
                    )
                )).scalar_one()

                terminal_number = "00001"
                if sale.cash_session_id:
                    cash_session = (await self.db.execute(
                        select(CashRegisterSession).where(CashRegisterSession.id == sale.cash_session_id)
                    )).scalar_one_or_none()
                    if cash_session:
                        register = (await self.db.execute(
                            select(CashRegister).where(CashRegister.id == cash_session.cash_register_id)
                        )).scalar_one_or_none()
                        if register:
                            terminal_number = register.pos_terminal_number

                consecutive_int = await ConsecutiveService(self.db).get_next_consecutive_atomic(
                    organization_id=self.organization_id,
                    branch_code=branch.code,
                    terminal_number=terminal_number,
                    doc_type="03",
                    environment=original_invoice.environment,
                )
                consecutive_number = ConsecutiveService.build_consecutivo_20(
                    branch_code=branch.code,
                    terminal_number=terminal_number,
                    doc_type="03",
                    consecutive_int=consecutive_int,
                )
                numeric_key, _ = ConsecutiveService.build_clave_50(
                    emitter_tax_id=org.identification_number,
                    consecutivo_20=consecutive_number,
                    doc_date=datetime.now(timezone.utc),
                    situation="1",
                )
                credit_note = ElectronicInvoice(
                    organization_id=self.organization_id,
                    branch_id=sale.branch_id,
                    sale_id=sale.id,
                    doc_type="03",
                    numeric_key=numeric_key,
                    consecutive_number=consecutive_number,
                    environment=original_invoice.environment,
                    currency=original_invoice.currency,
                    exchange_rate=original_invoice.exchange_rate,
                    subtotal_amount=original_invoice.subtotal_amount,
                    discount_amount=original_invoice.discount_amount,
                    tax_amount=original_invoice.tax_amount,
                    total_amount=original_invoice.total_amount,
                    receiver_tax_id_type=original_invoice.receiver_tax_id_type,
                    receiver_tax_id=original_invoice.receiver_tax_id,
                    receiver_name=original_invoice.receiver_name,
                    receiver_email=original_invoice.receiver_email,
                    reference_doc_type=original_invoice.doc_type,
                    reference_numeric_key=original_invoice.numeric_key,
                    reference_date=original_invoice.created_at,
                    reference_code="01",
                    reference_reason=data.reason,
                    status="DRAFT",
                )
                self.db.add(credit_note)
                await self.db.flush()

                credit_note = await ElectronicInvoicingService(self.db).prepare_and_sign_invoice(
                    credit_note.id, self.organization_id
                )
                await OutboxService.enqueue_invoice(
                    db=self.db,
                    organization_id=self.organization_id,
                    branch_id=sale.branch_id,
                    invoice_id=credit_note.id,
                    numeric_key=credit_note.numeric_key,
                    consecutive_number=credit_note.consecutive_number,
                    doc_type="03",
                    xml_uncompressed=credit_note.xml_generated or "",
                    xml_signed=credit_note.xml_signed or "",
                )
                credit_note.status = "QUEUED"
            elif original_invoice.status in {"DRAFT", "SIGNED", "QUEUED", "PENDING", "ERROR", "CONTINGENCY"}:
                if original_outbox:
                    original_outbox.status = "CANCELLED"
                    original_outbox.next_retry_at = None
                    original_outbox.last_error = f"Cancelado antes de transmisión por devolución: {data.reason}"
                original_invoice.status = "CANCELLED"

        sale.status = "REFUNDED"
        await AuditService.log_action(
            db=self.db,
            action="SALE_REFUNDED",
            resource="Sale",
            actor_id=actor_id,
            organization_id=self.organization_id,
            branch_id=sale.branch_id,
            resource_id=str(sale.id),
            payload_after={
                "reason": data.reason,
                "original_invoice_id": str(original_invoice.id) if original_invoice else None,
                "credit_note_id": str(credit_note.id) if credit_note else None,
            }
        )

        if commit:
            await self.db.commit()
        else:
            await self.db.flush()
        stmt = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.payments)
        ).where(Sale.id == sale.id)
        res = await self.db.execute(stmt)
        return res.scalar_one()

    async def list_sales(
        self,
        branch_id: Optional[uuid.UUID] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Sale]:
        stmt = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.payments)
        ).where(
            Sale.organization_id == self.organization_id
        )
        if branch_id:
            stmt = stmt.where(Sale.branch_id == branch_id)

        stmt = stmt.order_by(desc(Sale.created_at)).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_sale(self, sale_id: uuid.UUID) -> Sale:
        stmt = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.payments)
        ).where(
            Sale.id == sale_id,
            Sale.organization_id == self.organization_id
        )
        res = await self.db.execute(stmt)
        sale = res.scalar_one_or_none()
        if not sale:
            raise NotFoundException("Venta no encontrada")
        return sale
