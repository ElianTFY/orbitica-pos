import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.core.exceptions import ConflictException, NotFoundException
from app.services.audit_service import AuditService

class CustomerService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def list_customers(self, search: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Customer]:
        stmt = select(Customer).where(
            Customer.organization_id == self.organization_id,
            Customer.is_active == True
        )
        if search:
            s = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    Customer.name.ilike(s),
                    Customer.identification_number.ilike(s),
                    Customer.email.ilike(s)
                )
            )
        stmt = stmt.order_by(Customer.name.asc()).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_customer(self, customer_id: uuid.UUID) -> Customer:
        customer = (await self.db.execute(
            select(Customer).where(
                Customer.id == customer_id,
                Customer.organization_id == self.organization_id,
            )
        )).scalar_one_or_none()
        if not customer:
            raise NotFoundException("Cliente no encontrado")
        return customer

    async def create_customer(self, data: CustomerCreate, actor_id: uuid.UUID) -> Customer:
        if data.identification_number:
            stmt = select(Customer).where(
                Customer.organization_id == self.organization_id,
                Customer.identification_number == data.identification_number.strip(),
                Customer.is_active == True
            )
            res = await self.db.execute(stmt)
            if res.scalar_one_or_none():
                raise ConflictException(f"Ya existe un cliente con la identificación '{data.identification_number}'")

        customer = Customer(
            organization_id=self.organization_id,
            identification_type=data.identification_type,
            identification_number=data.identification_number.strip() if data.identification_number else None,
            name=data.name.strip(),
            email=str(data.email).strip().lower() if data.email else None,
            phone=data.phone.strip() if data.phone else None,
            address=data.address,
            notes=data.notes
        )
        self.db.add(customer)
        await self.db.flush()
        await AuditService.log_action(
            db=self.db,
            action="CUSTOMER_CREATED",
            resource="Customer",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(customer.id),
            payload_after={"name": customer.name, "identification_number": customer.identification_number},
        )
        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def update_customer(self, customer_id: uuid.UUID, data: CustomerUpdate, actor_id: uuid.UUID) -> Customer:
        customer = await self.get_customer(customer_id)
        if data.identification_number and data.identification_number.strip() != customer.identification_number:
            duplicate = (await self.db.execute(
                select(Customer).where(
                    Customer.organization_id == self.organization_id,
                    Customer.identification_number == data.identification_number.strip(),
                    Customer.id != customer_id,
                    Customer.is_active == True,
                )
            )).scalar_one_or_none()
            if duplicate:
                raise ConflictException(
                    f"Ya existe un cliente con la identificación '{data.identification_number}'"
                )

        changes = data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            if field in {"name", "identification_number", "phone"} and isinstance(value, str):
                value = value.strip()
            if field == "email" and value is not None:
                value = str(value).strip().lower()
            setattr(customer, field, value)

        await AuditService.log_action(
            db=self.db,
            action="CUSTOMER_UPDATED",
            resource="Customer",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(customer.id),
            payload_after={"name": customer.name, "is_active": customer.is_active},
        )
        await self.db.commit()
        await self.db.refresh(customer)
        return customer
