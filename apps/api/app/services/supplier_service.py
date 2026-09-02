import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.core.exceptions import NotFoundException, ConflictException
from app.services.audit_service import AuditService

class SupplierService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_suppliers(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Supplier]:
        stmt = select(Supplier).where(Supplier.organization_id == self.organization_id)
        if is_active is not None:
            stmt = stmt.where(Supplier.is_active == is_active)
        if search:
            s = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    Supplier.name.ilike(s),
                    Supplier.identification_number.ilike(s),
                    Supplier.email.ilike(s)
                )
            )
        stmt = stmt.order_by(Supplier.name.asc()).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_supplier(self, supplier_id: uuid.UUID) -> Supplier:
        stmt = select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.organization_id == self.organization_id
        )
        res = await self.db.execute(stmt)
        supplier = res.scalar_one_or_none()
        if not supplier:
            raise NotFoundException("Proveedor no encontrado")
        return supplier

    async def create_supplier(self, data: SupplierCreate, actor_id: uuid.UUID) -> Supplier:
        # Check unique identification_number in org
        stmt = select(Supplier).where(
            Supplier.organization_id == self.organization_id,
            Supplier.identification_number == data.identification_number.strip()
        )
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException(f"Ya existe un proveedor con la identificación '{data.identification_number}'")

        supplier = Supplier(
            organization_id=self.organization_id,
            identification_type=data.identification_type,
            identification_number=data.identification_number.strip(),
            name=data.name.strip(),
            trade_name=data.trade_name.strip() if data.trade_name else None,
            email=data.email,
            phone=data.phone,
            address=data.address
        )
        self.db.add(supplier)
        await self.db.flush()

        await AuditService.log_action(
            db=self.db,
            action="SUPPLIER_CREATED",
            resource="Supplier",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(supplier.id),
            payload_after={"name": supplier.name, "identification_number": supplier.identification_number}
        )

        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def update_supplier(self, supplier_id: uuid.UUID, data: SupplierUpdate, actor_id: uuid.UUID) -> Supplier:
        supplier = await self.get_supplier(supplier_id)

        if data.identification_number and data.identification_number.strip() != supplier.identification_number:
            stmt = select(Supplier).where(
                Supplier.organization_id == self.organization_id,
                Supplier.identification_number == data.identification_number.strip(),
                Supplier.id != supplier_id
            )
            res = await self.db.execute(stmt)
            if res.scalar_one_or_none():
                raise ConflictException(f"Ya existe un proveedor con la identificación '{data.identification_number}'")
            supplier.identification_number = data.identification_number.strip()

        if data.identification_type is not None:
            supplier.identification_type = data.identification_type
        if data.name is not None:
            supplier.name = data.name.strip()
        if data.trade_name is not None:
            supplier.trade_name = data.trade_name.strip() if data.trade_name else None
        if data.email is not None:
            supplier.email = data.email
        if data.phone is not None:
            supplier.phone = data.phone
        if data.address is not None:
            supplier.address = data.address
        if data.is_active is not None:
            supplier.is_active = data.is_active

        await AuditService.log_action(
            db=self.db,
            action="SUPPLIER_UPDATED",
            resource="Supplier",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(supplier.id),
            payload_after={"name": supplier.name, "is_active": supplier.is_active}
        )

        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier
