import uuid
from decimal import Decimal
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.models.catalog import Product, BranchProductStock
from app.models.branch import Branch
from app.models.user import User
from app.models.inventory import InventoryMovement
from app.schemas.inventory import InventoryAdjustmentCreate, InventoryTransferCreate
from app.core.exceptions import NotFoundException, BadRequestException
from app.services.audit_service import AuditService

class InventoryService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def adjust_stock(self, data: InventoryAdjustmentCreate, actor_id: uuid.UUID) -> BranchProductStock:
        # Verify Product exists
        prod_stmt = select(Product).where(Product.id == data.product_id, Product.organization_id == self.organization_id)
        prod_res = await self.db.execute(prod_stmt)
        prod = prod_res.scalar_one_or_none()
        if not prod:
            raise NotFoundException("Producto no encontrado")

        # Get or create BranchProductStock
        stk_stmt = select(BranchProductStock).where(
            BranchProductStock.branch_id == data.branch_id,
            BranchProductStock.product_id == data.product_id
        )
        stk_res = await self.db.execute(stk_stmt)
        stock_record = stk_res.scalar_one_or_none()

        prev_qty = stock_record.quantity if stock_record else Decimal("0.00")
        new_qty = prev_qty + data.quantity

        if new_qty < 0:
            raise BadRequestException(f"El ajuste resultaría en stock negativo ({new_qty}). Stock actual: {prev_qty}")

        if stock_record:
            stock_record.quantity = new_qty
        else:
            stock_record = BranchProductStock(
                branch_id=data.branch_id,
                product_id=data.product_id,
                quantity=new_qty
            )
            self.db.add(stock_record)

        # Record Ledger Movement (Immutable)
        movement = InventoryMovement(
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            product_id=data.product_id,
            actor_id=actor_id,
            movement_type=data.movement_type,
            quantity=data.quantity,
            previous_quantity=prev_qty,
            new_quantity=new_qty,
            reason=data.reason
        )
        self.db.add(movement)

        await AuditService.log_action(
            db=self.db,
            action="INVENTORY_ADJUSTMENT",
            resource="InventoryMovement",
            actor_id=actor_id,
            organization_id=self.organization_id,
            branch_id=data.branch_id,
            resource_id=str(prod.id),
            payload_after={"prev_qty": str(prev_qty), "new_qty": str(new_qty), "reason": data.reason}
        )

        await self.db.commit()
        await self.db.refresh(stock_record)
        return stock_record

    async def transfer_stock(self, data: InventoryTransferCreate, actor_id: uuid.UUID) -> None:
        if data.from_branch_id == data.to_branch_id:
            raise BadRequestException("La sucursal de origen y destino deben ser distintas")

        # 1. Check stock in source branch
        from_stk_stmt = select(BranchProductStock).where(
            BranchProductStock.branch_id == data.from_branch_id,
            BranchProductStock.product_id == data.product_id
        )
        from_res = await self.db.execute(from_stk_stmt)
        from_stock = from_res.scalar_one_or_none()

        if not from_stock or from_stock.quantity < data.quantity:
            avail = from_stock.quantity if from_stock else Decimal("0.00")
            raise BadRequestException(f"Stock insuficiente en sucursal origen. Disponible: {avail}, Solicitado: {data.quantity}")

        # Decrement source
        prev_from = from_stock.quantity
        new_from = prev_from - data.quantity
        from_stock.quantity = new_from

        # 2. Increment target branch
        to_stk_stmt = select(BranchProductStock).where(
            BranchProductStock.branch_id == data.to_branch_id,
            BranchProductStock.product_id == data.product_id
        )
        to_res = await self.db.execute(to_stk_stmt)
        to_stock = to_res.scalar_one_or_none()

        prev_to = to_stock.quantity if to_stock else Decimal("0.00")
        new_to = prev_to + data.quantity

        if to_stock:
            to_stock.quantity = new_to
        else:
            to_stock = BranchProductStock(
                branch_id=data.to_branch_id,
                product_id=data.product_id,
                quantity=new_to
            )
            self.db.add(to_stock)

        # 3. Log 2 Ledger movements (TRANSFER_OUT + TRANSFER_IN)
        mov_out = InventoryMovement(
            organization_id=self.organization_id,
            branch_id=data.from_branch_id,
            product_id=data.product_id,
            actor_id=actor_id,
            movement_type="TRANSFER_OUT",
            quantity=-data.quantity,
            previous_quantity=prev_from,
            new_quantity=new_from,
            reason=f"Traslado hacia sucursal destino. {data.reason or ''}"
        )
        mov_in = InventoryMovement(
            organization_id=self.organization_id,
            branch_id=data.to_branch_id,
            product_id=data.product_id,
            actor_id=actor_id,
            movement_type="TRANSFER_IN",
            quantity=data.quantity,
            previous_quantity=prev_to,
            new_quantity=new_to,
            reason=f"Recepción desde sucursal origen. {data.reason or ''}"
        )
        self.db.add_all([mov_out, mov_in])
        await self.db.commit()

    async def get_low_stock_alerts(self, branch_id: Optional[uuid.UUID] = None) -> List[dict]:
        stmt = select(
            Product.id,
            Product.name,
            Product.sku,
            Product.barcode,
            Product.min_stock_alert,
            BranchProductStock.quantity,
            Branch.id,
            Branch.name
        ).join(
            BranchProductStock, Product.id == BranchProductStock.product_id
        ).join(
            Branch, BranchProductStock.branch_id == Branch.id
        ).where(
            Product.organization_id == self.organization_id,
            Product.is_active == True,
            Product.is_service == False,
            BranchProductStock.quantity <= Product.min_stock_alert
        )

        if branch_id:
            stmt = stmt.where(BranchProductStock.branch_id == branch_id)

        res = await self.db.execute(stmt)
        rows = res.all()

        alerts = []
        for p_id, p_name, sku, barcode, min_alert, qty, b_id, b_name in rows:
            alerts.append({
                "product_id": p_id,
                "product_name": p_name,
                "sku": sku,
                "barcode": barcode,
                "min_stock_alert": min_alert,
                "current_stock": qty,
                "branch_id": b_id,
                "branch_name": b_name
            })
        return alerts

    async def list_movements(
        self,
        branch_id: Optional[uuid.UUID] = None,
        product_id: Optional[uuid.UUID] = None,
        movement_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[dict]:
        stmt = select(
            InventoryMovement,
            Product.name,
            User.full_name
        ).join(
            Product, InventoryMovement.product_id == Product.id
        ).join(
            User, InventoryMovement.actor_id == User.id
        ).where(
            InventoryMovement.organization_id == self.organization_id
        )

        if branch_id:
            stmt = stmt.where(InventoryMovement.branch_id == branch_id)
        if product_id:
            stmt = stmt.where(InventoryMovement.product_id == product_id)
        if movement_type:
            stmt = stmt.where(InventoryMovement.movement_type == movement_type)

        stmt = stmt.order_by(desc(InventoryMovement.created_at)).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        rows = res.all()

        result = []
        for mov, p_name, u_name in rows:
            result.append({
                "id": mov.id,
                "organization_id": mov.organization_id,
                "branch_id": mov.branch_id,
                "product_id": mov.product_id,
                "product_name": p_name,
                "actor_id": mov.actor_id,
                "actor_name": u_name,
                "movement_type": mov.movement_type,
                "quantity": mov.quantity,
                "previous_quantity": mov.previous_quantity,
                "new_quantity": mov.new_quantity,
                "reference_id": mov.reference_id,
                "reason": mov.reason,
                "created_at": mov.created_at
            })
        return result
