import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate
from app.core.exceptions import ConflictException

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

    async def create_customer(self, data: CustomerCreate) -> Customer:
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
        await self.db.commit()
        await self.db.refresh(customer)
        return customer
