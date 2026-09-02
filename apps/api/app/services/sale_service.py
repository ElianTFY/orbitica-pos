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
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.cash_register import CashRegister, CashRegisterSession
from app.schemas.sale import SaleCreate, RefundRequest
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.services.consecutive_service import ConsecutiveService
from app.services.audit_service import AuditService
from app.services.hacienda_xml_generator_v44 import map_tax_rate_code

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class SaleService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def create_sale(self, data: SaleCreate, user_id: uuid.UUID) -> Sale:
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
        if data.customer_id:
            from app.models.customer import Customer
            cust_stmt = select(Customer).where(
                Customer.id == data.customer_id,
                Customer.organization_id == self.organization_id
            )
            cust_res = await self.db.execute(cust_stmt)
            cust = cust_res.scalar_one_or_none()
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
        sale_number = f"V-{consecutive_int:06d}"

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
            gross_line = unit_price * item_in.quantity
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

        sale_payments = []
        for p_in in data.payments:
            sale_payments.append(
                SalePayment(
                    payment_method=p_in.payment_method,
                    amount=p_in.amount,
                    change_returned=change_calc if p_in.payment_method.startswith("CASH") else Decimal("0.00"),
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

        await self.db.commit()
        stmt = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.payments)
        ).where(Sale.id == sale.id)
        res = await self.db.execute(stmt)
        return res.scalar_one()

    async def refund_sale(self, sale_id: uuid.UUID, data: RefundRequest, actor_id: uuid.UUID) -> Sale:
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

        if sale.status == "REFUNDED":
            raise ConflictException("Esta venta ya ha sido devuelta / reembolsada")

        if sale.status != "COMPLETED":
            raise BadRequestException(f"No se puede devolver una venta con estado '{sale.status}'")

        # Load items to return stock
        items_stmt = select(SaleItem).where(SaleItem.sale_id == sale.id)
        items_res = await self.db.execute(items_stmt)
        items = list(items_res.scalars().all())

        for item in items:
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

        sale.status = "REFUNDED"
        await AuditService.log_action(
            db=self.db,
            action="SALE_REFUNDED",
            resource="Sale",
            actor_id=actor_id,
            organization_id=self.organization_id,
            branch_id=sale.branch_id,
            resource_id=str(sale.id),
            payload_after={"reason": data.reason}
        )

        await self.db.commit()
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
