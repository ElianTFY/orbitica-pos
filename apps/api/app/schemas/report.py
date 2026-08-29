from uuid import UUID
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.common import BaseSchema

class PaymentMethodSummary(BaseModel):
    method: str
    total_amount: Decimal
    transaction_count: int
    percentage: Decimal

class TopProductSummary(BaseModel):
    product_id: UUID
    name: str
    units_sold: Decimal
    total_sales: Decimal
    total_cost: Decimal
    gross_profit: Decimal

class SalesSummaryReport(BaseModel):
    total_sales: Decimal
    total_subtotal: Decimal
    total_taxes: Decimal
    total_discounts: Decimal
    total_cost: Decimal
    estimated_profit: Decimal
    transaction_count: int
    average_ticket: Decimal
    payments_breakdown: List[PaymentMethodSummary]
    top_products: List[TopProductSummary]

class InventoryValuationReport(BaseModel):
    total_products: int
    total_units: Decimal
    valuation_at_cost: Decimal
    valuation_at_sale_price: Decimal
    potential_gross_margin: Decimal
