import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.catalog import Product, BranchProductStock
from app.models.inventory import InventoryMovement
from app.models.customer import Customer # for supplier representation
from app.schemas.purchase import SupplierCreate, PurchaseCreate
from app.core.exceptions import NotFoundException, BadRequestException
from app.services.audit_service import AuditService

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class PurchaseService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_suppliers(self, search: Optional[str] = None) -> List[Customer]:
        stmt = select(Customer).where(
            Customer.organization_id == self.organization_id,
            Customer.is_active == True
        )
        if search:
            s = f"%{search.strip().lower()}%"
            stmt = stmt.where(or_(Customer.name.ilike(s), Customer.identification_number.ilike(s)))
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_supplier(self, data: SupplierCreate) -> Customer:
        supp = Customer(
            organization_id=self.organization_id,
            name=data.name.strip(),
            identification_type=data.legal_id_type,
            identification_number=data.legal_id.strip(),
            email=data.email.strip().lower() if data.email else None,
            phone=data.phone.strip() if data.phone else None,
            address=data.address,
            notes=f"Proveedor - Contacto: {data.contact_person}" if data.contact_person else "Proveedor"
        )
        self.db.add(supp)
        await self.db.commit()
        await self.db.refresh(supp)
        return supp

    async def create_purchase(self, data: PurchaseCreate, user_id: uuid.UUID, default_branch_id: uuid.UUID) -> dict:
        branch_id = data.branch_id or default_branch_id

        # Validate Supplier
        supp_stmt = select(Customer).where(Customer.id == data.supplier_id, Customer.organization_id == self.organization_id)
        supp_res = await self.db.execute(supp_stmt)
        supp = supp_res.scalar_one_or_none()
        if not supp:
            raise NotFoundException("Proveedor no encontrado")

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        items_processed = []

        for it in data.items:
            prod_stmt = select(Product).where(Product.id == it.product_id, Product.organization_id == self.organization_id)
            prod_res = await self.db.execute(prod_stmt)
            prod = prod_res.scalar_one_or_none()
            if not prod:
                raise NotFoundException(f"Producto {it.product_id} no encontrado")

            line_sub = round_money(it.quantity * it.unit_cost)
            line_tax = round_money(line_sub * it.tax_rate)
            line_tot = line_sub + line_tax

            subtotal += line_sub
            total_tax += line_tax

            # Increase Stock in Branch
            stock_stmt = select(BranchProductStock).where(
                BranchProductStock.branch_id == branch_id,
                BranchProductStock.product_id == prod.id
            )
            stock_res = await self.db.execute(stock_stmt)
            stock = stock_res.scalar_one_or_none()

            old_qty = stock.quantity if stock else Decimal("0.00")
            new_qty = old_qty + it.quantity

            if stock:
                stock.quantity = new_qty
            else:
                stock = BranchProductStock(
                    branch_id=branch_id,
                    product_id=prod.id,
                    quantity=new_qty
                )
                self.db.add(stock)

            # Update product cost price
            prod.cost_price = it.unit_cost

            # Record Inmutable Ledger Movement IN_PURCHASE
            movement = InventoryMovement(
                organization_id=self.organization_id,
                branch_id=branch_id,
                product_id=prod.id,
                actor_id=user_id,
                movement_type="IN_PURCHASE",
                quantity=it.quantity,
                previous_quantity=old_qty,
                new_quantity=new_qty,
                reference_id=None,
                reason=f"Compra Factura #{data.invoice_number} de {supp.name}"
            )
            self.db.add(movement)

            items_processed.append({
                "product_id": prod.id,
                "product_name": prod.name,
                "quantity": it.quantity,
                "unit_cost": it.unit_cost,
                "tax_rate": it.tax_rate,
                "tax_amount": line_tax,
                "line_total": line_tot
            })

        total_amount = subtotal + total_tax
        purchase_id = uuid.uuid4()

        await AuditService.log_action(
            db=self.db,
            action="PURCHASE_REGISTERED",
            resource="Purchase",
            actor_id=user_id,
            organization_id=self.organization_id,
            resource_id=str(purchase_id),
            payload_after={
                "invoice_number": data.invoice_number,
                "supplier": supp.name,
                "total": str(total_amount),
                "items_count": len(items_processed)
            }
        )

        await self.db.commit()

        return {
            "id": purchase_id,
            "organization_id": self.organization_id,
            "branch_id": branch_id,
            "supplier_id": supp.id,
            "supplier_name": supp.name,
            "invoice_number": data.invoice_number,
            "payment_type": data.payment_type,
            "status": "RECEIVED",
            "subtotal_amount": subtotal,
            "tax_amount": total_tax,
            "total_amount": total_amount,
            "created_at": datetime.now(timezone.utc),
            "items": items_processed
        }
