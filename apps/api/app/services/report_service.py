import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from app.models.sale import Sale, SaleItem, SalePayment
from app.models.catalog import Product, BranchProductStock
from app.schemas.report import SalesSummaryReport, PaymentMethodSummary, TopProductSummary, InventoryValuationReport

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class ReportService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    async def get_sales_summary(
        self,
        branch_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> SalesSummaryReport:
        # Query sales
        stmt = select(Sale).where(
            Sale.organization_id == self.organization_id,
            Sale.status == "COMPLETED"
        )
        if branch_id:
            stmt = stmt.where(Sale.branch_id == branch_id)
        if start_date:
            stmt = stmt.where(Sale.created_at >= start_date)
        if end_date:
            stmt = stmt.where(Sale.created_at <= end_date)

        res = await self.db.execute(stmt)
        sales = list(res.scalars().all())

        total_sales = sum(s.total_amount for s in sales) if sales else Decimal("0.00")
        total_subtotal = sum(s.subtotal_amount for s in sales) if sales else Decimal("0.00")
        total_taxes = sum(s.tax_amount for s in sales) if sales else Decimal("0.00")
        total_discounts = sum(s.discount_amount for s in sales) if sales else Decimal("0.00")
        tx_count = len(sales)
        avg_ticket = round_money(total_sales / Decimal(tx_count)) if tx_count > 0 else Decimal("0.00")

        # Query Items for Costs & Profit & Top Products
        sale_ids = [s.id for s in sales]
        top_products = []
        total_cost = Decimal("0.00")

        if sale_ids:
            item_stmt = select(
                SaleItem.product_id,
                SaleItem.product_name,
                func.sum(SaleItem.quantity).label("units"),
                func.sum(SaleItem.line_total).label("total_rev"),
                func.sum(SaleItem.unit_cost * SaleItem.quantity).label("total_c")
            ).where(
                SaleItem.sale_id.in_(sale_ids)
            ).group_by(SaleItem.product_id, SaleItem.product_name).order_by(desc("units")).limit(10)

            item_res = await self.db.execute(item_stmt)
            for p_id, p_name, u_sum, rev_sum, c_sum in item_res.all():
                u_dec = u_sum or Decimal("0.00")
                rev_dec = rev_sum or Decimal("0.00")
                cost_dec = c_sum or Decimal("0.00")
                profit_dec = rev_dec - cost_dec
                total_cost += cost_dec

                top_products.append(
                    TopProductSummary(
                        product_id=p_id,
                        name=p_name,
                        units_sold=u_dec,
                        total_sales=rev_dec,
                        total_cost=cost_dec,
                        gross_profit=profit_dec
                    )
                )

        est_profit = total_sales - total_cost

        # Payments Breakdown
        payments_breakdown = []
        if sale_ids:
            p_stmt = select(
                SalePayment.payment_method,
                func.sum(SalePayment.amount),
                func.count(SalePayment.id)
            ).where(
                SalePayment.sale_id.in_(sale_ids)
            ).group_by(SalePayment.payment_method)

            p_res = await self.db.execute(p_stmt)
            for p_method, p_total, p_count in p_res.all():
                tot_dec = p_total or Decimal("0.00")
                pct = round_money((tot_dec / total_sales) * Decimal("100.00")) if total_sales > 0 else Decimal("0.00")
                payments_breakdown.append(
                    PaymentMethodSummary(
                        method=p_method,
                        total_amount=tot_dec,
                        transaction_count=p_count,
                        percentage=pct
                    )
                )

        return SalesSummaryReport(
            total_sales=total_sales,
            total_subtotal=total_subtotal,
            total_taxes=total_taxes,
            total_discounts=total_discounts,
            total_cost=total_cost,
            estimated_profit=est_profit,
            transaction_count=tx_count,
            average_ticket=avg_ticket,
            payments_breakdown=payments_breakdown,
            top_products=top_products
        )

    async def get_inventory_valuation(self, branch_id: Optional[uuid.UUID] = None) -> InventoryValuationReport:
        stmt = select(
            Product.id,
            Product.cost_price,
            Product.sale_price,
            BranchProductStock.quantity
        ).join(
            BranchProductStock, Product.id == BranchProductStock.product_id
        ).where(
            Product.organization_id == self.organization_id,
            Product.is_active == True,
            Product.is_service == False
        )
        if branch_id:
            stmt = stmt.where(BranchProductStock.branch_id == branch_id)

        res = await self.db.execute(stmt)
        rows = res.all()

        total_prods = len(rows)
        total_units = sum(r[3] for r in rows) if rows else Decimal("0.00")
        val_cost = sum(r[1] * r[3] for r in rows) if rows else Decimal("0.00")
        val_sale = sum(r[2] * r[3] for r in rows) if rows else Decimal("0.00")
        margin = val_sale - val_cost

        return InventoryValuationReport(
            total_products=total_prods,
            total_units=total_units,
            valuation_at_cost=val_cost,
            valuation_at_sale_price=val_sale,
            potential_gross_margin=margin
        )
