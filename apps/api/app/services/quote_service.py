from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.quote import Quote, QuoteItem
from app.models.catalog import Product, TaxRate
from app.models.customer import Customer
from app.models.branch import Branch
from app.schemas.quote import QuoteCreate, QuoteConvertToSaleRequest
from app.schemas.sale import SaleCreate, SaleItemCreate, SalePaymentCreate
from app.services.sale_service import SaleService
from app.core.exceptions import NotFoundException, BadRequestException

class QuoteService:
    def __init__(self, db: AsyncSession, organization_id: UUID):
        self.db = db
        self.organization_id = organization_id

    async def create_quote(self, data: QuoteCreate, user_id: UUID) -> Quote:
        branch_id = data.branch_id
        if not branch_id:
            b_stmt = select(Branch).where(
                Branch.organization_id == self.organization_id,
                Branch.is_active == True
            ).order_by(Branch.is_main.desc())
            b_res = await self.db.execute(b_stmt)
            branch = b_res.scalars().first()
            if not branch:
                raise BadRequestException("No hay sucursales activas en la organización")
            branch_id = branch.id

        # Generate quote number
        count_stmt = select(func.count(Quote.id)).where(Quote.organization_id == self.organization_id)
        count_res = await self.db.execute(count_stmt)
        count = count_res.scalar_one() or 0
        quote_number = f"COT-{count + 1:06d}"

        total_subtotal = Decimal("0.00")
        total_discount = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_final = Decimal("0.00")

        quote_items = []
        for item_in in data.items:
            p_stmt = (
                select(Product, TaxRate.rate)
                .join(TaxRate, Product.tax_rate_id == TaxRate.id)
                .where(
                    Product.id == item_in.product_id,
                    Product.organization_id == self.organization_id,
                    Product.is_active == True
                )
            )
            p_res = await self.db.execute(p_stmt)
            row = p_res.first()
            if not row:
                raise BadRequestException(f"Producto {item_in.product_id} no encontrado o inactivo")
            prod, tax_rate_val = row

            gross_line = prod.sale_price * item_in.quantity
            disc_amount = gross_line * (item_in.discount_percentage / Decimal("100.00"))
            net_line = gross_line - disc_amount
            line_tax = net_line * (tax_rate_val / Decimal("100.00"))
            line_total = net_line + line_tax

            total_subtotal += gross_line
            total_discount += disc_amount
            total_tax += line_tax
            total_final += line_total

            quote_items.append(
                QuoteItem(
                    product_id=prod.id,
                    product_name=prod.name,
                    quantity=item_in.quantity,
                    unit_price=prod.sale_price,
                    discount_percentage=item_in.discount_percentage,
                    discount_amount=disc_amount,
                    tax_rate=tax_rate_val,
                    tax_amount=line_tax,
                    line_total=line_total
                )
            )

        now = datetime.now(timezone.utc)
        quote = Quote(
            organization_id=self.organization_id,
            branch_id=branch_id,
            customer_id=data.customer_id,
            user_id=user_id,
            quote_number=quote_number,
            currency=data.currency,
            subtotal_amount=total_subtotal,
            discount_amount=total_discount,
            tax_amount=total_tax,
            total_amount=total_final,
            status="DRAFT",
            notes=data.notes,
            valid_until=now + timedelta(days=data.valid_days),
            items=quote_items
        )

        self.db.add(quote)
        await self.db.commit()
        return await self.get_quote(quote.id)

    async def list_quotes(self, limit: int = 50, offset: int = 0) -> List[Quote]:
        stmt = (
            select(Quote)
            .options(selectinload(Quote.items))
            .where(Quote.organization_id == self.organization_id)
            .order_by(Quote.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        res = await self.db.execute(stmt)
        quotes = list(res.scalars())

        # Populate customer_name if customer_id
        for q in quotes:
            if q.customer_id:
                c_stmt = select(Customer.name).where(Customer.id == q.customer_id)
                c_res = await self.db.execute(c_stmt)
                c_name = c_res.scalar_one_or_none()
                setattr(q, "customer_name", c_name)
        return quotes

    async def get_quote(self, quote_id: UUID) -> Quote:
        stmt = (
            select(Quote)
            .options(selectinload(Quote.items))
            .where(Quote.id == quote_id, Quote.organization_id == self.organization_id)
        )
        res = await self.db.execute(stmt)
        quote = res.scalar_one_or_none()
        if not quote:
            raise NotFoundException("Cotización no encontrada")
        if quote.customer_id:
            c_stmt = select(Customer.name).where(Customer.id == quote.customer_id)
            c_res = await self.db.execute(c_stmt)
            setattr(quote, "customer_name", c_res.scalar_one_or_none())
        return quote

    async def convert_quote_to_sale(
        self,
        quote_id: UUID,
        convert_data: QuoteConvertToSaleRequest,
        actor_id: UUID
    ):
        quote = await self.get_quote(quote_id)
        if quote.status == "CONVERTED":
            raise BadRequestException("Esta cotización ya fue convertida a una venta anteriormente")

        sale_service = SaleService(self.db, self.organization_id)

        # Build SaleCreate from Quote items
        sale_items = [
            SaleItemCreate(
                product_id=qi.product_id,
                quantity=qi.quantity,
                discount_percentage=qi.discount_percentage
            )
            for qi in quote.items
        ]

        payment = SalePaymentCreate(
            payment_method=convert_data.payment_method,
            amount=quote.total_amount,
            reference_number=convert_data.sinpe_reference
        )

        sale_payload = SaleCreate(
            branch_id=quote.branch_id,
            cash_session_id=convert_data.cash_session_id,
            customer_id=quote.customer_id,
            items=sale_items,
            payments=[payment],
            currency=quote.currency,
            notes=f"Convertida desde cotización {quote.quote_number}"
        )

        sale = await sale_service.create_sale(data=sale_payload, user_id=actor_id)

        quote.status = "CONVERTED"
        quote.converted_sale_id = sale.id
        await self.db.commit()
        return sale
