import uuid
import csv
import io
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from app.models.sale import Sale, SaleItem, SalePayment
from app.models.catalog import Product, BranchProductStock, TaxRate
from app.models.invoice import ElectronicInvoice
from app.core.exceptions import BadRequestException
from app.schemas.report import SalesSummaryReport, PaymentMethodSummary, TopProductSummary, InventoryValuationReport

def round_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class ReportService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    def _sales_query(self, branch_id=None, start_date=None, end_date=None, currency="CRC"):
        start_date = start_date.replace(tzinfo=timezone.utc) if start_date and start_date.tzinfo is None else start_date
        end_date = end_date.replace(tzinfo=timezone.utc) if end_date and end_date.tzinfo is None else end_date
        if start_date and end_date and start_date > end_date:
            raise BadRequestException("El inicio del período debe ser anterior al final")
        stmt = select(Sale).where(Sale.organization_id == self.organization_id,
                                  Sale.status == "COMPLETED", Sale.currency == currency)
        if branch_id:
            stmt = stmt.where(Sale.branch_id == branch_id)
        if start_date:
            stmt = stmt.where(Sale.created_at >= start_date)
        if end_date:
            stmt = stmt.where(Sale.created_at <= end_date)
        return stmt

    async def get_sales_summary(
        self,
        branch_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        currency: str = "CRC",
    ) -> SalesSummaryReport:
        # Query sales
        stmt = self._sales_query(branch_id, start_date, end_date, currency)

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
            # Aggregate every item, independently of the top-10 display limit.
            total_cost = (await self.db.execute(select(func.sum(
                SaleItem.unit_cost * SaleItem.quantity,
            )).where(SaleItem.sale_id.in_(sale_ids)))).scalar_one() or Decimal("0.00")
            item_stmt = select(
                SaleItem.product_id,
                SaleItem.product_name,
                func.sum(SaleItem.quantity).label("units"),
                func.sum(SaleItem.line_total).label("total_rev"),
                func.sum(SaleItem.tax_amount).label("total_tax"),
                func.sum(SaleItem.unit_cost * SaleItem.quantity).label("total_c")
            ).where(
                SaleItem.sale_id.in_(sale_ids)
            ).group_by(SaleItem.product_id, SaleItem.product_name).order_by(desc("units")).limit(10)

            item_res = await self.db.execute(item_stmt)
            for p_id, p_name, u_sum, rev_sum, tax_sum, c_sum in item_res.all():
                u_dec = u_sum or Decimal("0.00")
                rev_dec = rev_sum or Decimal("0.00")
                cost_dec = c_sum or Decimal("0.00")
                profit_dec = rev_dec - (tax_sum or Decimal("0.00")) - cost_dec

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

        # Sale.subtotal_amount is already net of discounts and excludes IVA.
        est_profit = total_subtotal - total_cost

        # Payments Breakdown
        payments_breakdown = []
        if sale_ids:
            p_stmt = select(
                SalePayment.payment_method,
                func.sum(SalePayment.amount - SalePayment.change_returned),
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
            currency=currency,
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

    async def export_sales_csv(self, branch_id=None, start_date=None, end_date=None, currency="CRC"):
        stmt = self._sales_query(branch_id, start_date, end_date, currency).add_columns(ElectronicInvoice).outerjoin(
            ElectronicInvoice, and_(ElectronicInvoice.sale_id == Sale.id,
                                    ElectronicInvoice.organization_id == self.organization_id,
                                    ElectronicInvoice.doc_type.in_(["01", "04"])),
        ).order_by(Sale.created_at, Sale.id)
        rows = (await self.db.execute(stmt)).all()
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(["Numero_Venta", "Consecutivo", "Clave_Hacienda", "Fecha_UTC", "Cliente",
                         "Moneda", "Subtotal_sin_IVA", "IVA", "Total", "Estado_Fiscal"])

        def safe_text(value):
            text = str(value or "")
            # Spreadsheet imports must not execute user-supplied formulas.
            return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text

        for sale, invoice in rows:
            receiver = (invoice.fiscal_snapshot or {}).get("receiver") if invoice else None
            name = (receiver or {}).get("name") or (invoice.receiver_name if invoice else None) or "Cliente contado"
            writer.writerow([safe_text(sale.sale_number), invoice.consecutive_number if invoice else "",
                             invoice.numeric_key if invoice else "", sale.created_at.isoformat(), safe_text(name),
                             sale.currency, f"{sale.subtotal_amount:.2f}", f"{sale.tax_amount:.2f}",
                             f"{sale.total_amount:.2f}", invoice.status if invoice else "SIN_COMPROBANTE"])
        return "\ufeff" + output.getvalue()

    async def get_inventory_valuation(self, branch_id: Optional[uuid.UUID] = None) -> InventoryValuationReport:
        stmt = select(
            Product.id,
            Product.cost_price,
            Product.sale_price,
            BranchProductStock.quantity,
            TaxRate.rate,
        ).join(
            BranchProductStock, Product.id == BranchProductStock.product_id
        ).join(TaxRate, Product.tax_rate_id == TaxRate.id).where(
            Product.organization_id == self.organization_id,
            Product.is_active == True,
            Product.is_service == False
        )
        if branch_id:
            stmt = stmt.where(BranchProductStock.branch_id == branch_id)

        res = await self.db.execute(stmt)
        rows = res.all()

        total_prods = len({row[0] for row in rows})
        total_units = sum(r[3] for r in rows) if rows else Decimal("0.00")
        val_cost = sum(r[1] * r[3] for r in rows) if rows else Decimal("0.00")
        val_sale = sum(r[2] * r[3] for r in rows) if rows else Decimal("0.00")
        # Sale prices include IVA, which is not part of gross margin.
        net_sale_value = sum((r[2] / (1 + r[4] / Decimal("100"))) * r[3] for r in rows) if rows else Decimal("0.00")
        margin = round_money(net_sale_value - val_cost)

        return InventoryValuationReport(
            total_products=total_prods,
            total_units=total_units,
            valuation_at_cost=val_cost,
            valuation_at_sale_price=val_sale,
            potential_gross_margin=margin
        )
