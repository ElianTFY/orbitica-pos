import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.models.purchase import Purchase, PurchaseItem
from app.models.catalog import Product, BranchProductStock
from app.models.inventory import InventoryMovement
from app.models.supplier import Supplier
from app.models.branch import Branch
from app.schemas.purchase import PurchaseCreate
from app.core.exceptions import NotFoundException, BadRequestException
from app.services.audit_service import AuditService

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class PurchaseService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_purchases(
        self,
        branch_id: Optional[uuid.UUID] = None,
        supplier_id: Optional[uuid.UUID] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Purchase]:
        stmt = (
            select(Purchase)
            .options(
                selectinload(Purchase.items),
                selectinload(Purchase.supplier)
            )
            .where(Purchase.organization_id == self.organization_id)
        )
        if branch_id:
            stmt = stmt.where(Purchase.branch_id == branch_id)
        if supplier_id:
            stmt = stmt.where(Purchase.supplier_id == supplier_id)

        stmt = stmt.order_by(desc(Purchase.created_at)).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_purchase(self, purchase_id: uuid.UUID) -> Purchase:
        stmt = (
            select(Purchase)
            .options(
                selectinload(Purchase.items),
                selectinload(Purchase.supplier)
            )
            .where(
                Purchase.id == purchase_id,
                Purchase.organization_id == self.organization_id
            )
        )
        res = await self.db.execute(stmt)
        purchase = res.scalar_one_or_none()
        if not purchase:
            raise NotFoundException("Orden de compra no encontrada")
        return purchase

    async def create_purchase(self, data: PurchaseCreate, user_id: uuid.UUID) -> Purchase:
        # 1. Validate branch and supplier
        b_stmt = select(Branch).where(
            Branch.id == data.branch_id,
            Branch.organization_id == self.organization_id
        )
        b_res = await self.db.execute(b_stmt)
        branch = b_res.scalar_one_or_none()
        if not branch:
            raise NotFoundException("Sucursal no encontrada")

        s_stmt = select(Supplier).where(
            Supplier.id == data.supplier_id,
            Supplier.organization_id == self.organization_id,
            Supplier.is_active == True
        )
        s_res = await self.db.execute(s_stmt)
        supplier = s_res.scalar_one_or_none()
        if not supplier:
            raise NotFoundException("Proveedor no encontrado o inactivo")

        if not data.items:
            raise BadRequestException("La orden de compra debe contener al menos un producto")

        # 2. Count existing purchases for numbering
        count_stmt = select(Purchase).where(
            Purchase.organization_id == self.organization_id,
            Purchase.branch_id == data.branch_id
        )
        count_res = await self.db.execute(count_stmt)
        num_count = len(count_res.scalars().all()) + 1
        purchase_number = f"COM-{branch.code}-{num_count:06d}"

        # 3. Process items and update stock atomically
        total_subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_final = Decimal("0.00")

        purchase_items = []
        stock_updates = []

        for item_in in data.items:
            p_stmt = select(Product).where(
                Product.id == item_in.product_id,
                Product.organization_id == self.organization_id,
                Product.is_active == True
            )
            p_res = await self.db.execute(p_stmt)
            prod = p_res.scalar_one_or_none()
            if not prod:
                raise NotFoundException(f"Producto ID '{item_in.product_id}' no encontrado o inactivo")

            # Calculate line
            line_subtotal = round_money(item_in.unit_cost * item_in.quantity)
            line_tax = round_money(line_subtotal * (item_in.tax_rate / Decimal("100.00")))
            line_total = line_subtotal + line_tax

            total_subtotal += line_subtotal
            total_tax += line_tax
            total_final += line_total

            purchase_items.append(
                PurchaseItem(
                    product_id=prod.id,
                    product_name=prod.name,
                    product_sku=prod.sku,
                    quantity=item_in.quantity,
                    unit_cost=item_in.unit_cost,
                    tax_rate=item_in.tax_rate,
                    tax_amount=line_tax,
                    line_total=line_total
                )
            )

            # Update product cost price if provided
            prod.cost_price = item_in.unit_cost

            # Lock and increment stock
            if not prod.is_service:
                stk_stmt = (
                    select(BranchProductStock)
                    .where(
                        BranchProductStock.branch_id == data.branch_id,
                        BranchProductStock.product_id == prod.id
                    )
                    .with_for_update()
                )
                stk_res = await self.db.execute(stk_stmt)
                stk_rec = stk_res.scalar_one_or_none()

                prev_qty = stk_rec.quantity if stk_rec else Decimal("0.00")
                new_qty = prev_qty + item_in.quantity

                if stk_rec:
                    stk_rec.quantity = new_qty
                else:
                    stk_rec = BranchProductStock(
                        branch_id=data.branch_id,
                        product_id=prod.id,
                        quantity=new_qty
                    )
                    self.db.add(stk_rec)

                stock_updates.append((prod.id, item_in.quantity, prev_qty, new_qty))

        # 4. Create Purchase
        purchase = Purchase(
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            supplier_id=data.supplier_id,
            user_id=user_id,
            purchase_number=purchase_number,
            invoice_number=data.invoice_number.strip() if data.invoice_number else None,
            currency=data.currency,
            subtotal_amount=total_subtotal,
            tax_amount=total_tax,
            total_amount=total_final,
            status="COMPLETED",
            payment_method=data.payment_method,
            notes=data.notes,
            items=purchase_items
        )
        self.db.add(purchase)
        await self.db.flush()

        # 5. Record Inventory Movements
        for prod_id, qty, prev_qty, new_qty in stock_updates:
            inv_mov = InventoryMovement(
                organization_id=self.organization_id,
                branch_id=data.branch_id,
                product_id=prod_id,
                actor_id=user_id,
                movement_type="PURCHASE",
                quantity=qty,
                previous_quantity=prev_qty,
                new_quantity=new_qty,
                reference_id=purchase.id,
                reason=f"Ingreso por Compra #{purchase_number}"
            )
            self.db.add(inv_mov)

        # 6. Audit Trail
        await AuditService.log_action(
            db=self.db,
            action="PURCHASE_COMPLETED",
            resource="Purchase",
            actor_id=user_id,
            organization_id=self.organization_id,
            resource_id=str(purchase.id),
            payload_after={
                "purchase_number": purchase.purchase_number,
                "total_amount": str(purchase.total_amount),
                "supplier_name": supplier.name,
                "items_count": len(purchase_items)
            }
        )

        await self.db.commit()

        # Reload with eager loaded items
        re_stmt = (
            select(Purchase)
            .options(selectinload(Purchase.items), selectinload(Purchase.supplier))
            .where(Purchase.id == purchase.id)
        )
        re_res = await self.db.execute(re_stmt)
        return re_res.scalar_one()
