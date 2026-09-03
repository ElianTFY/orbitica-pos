from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.report import SalesSummaryReport, InventoryValuationReport
from app.schemas.common import StandardResponse
from app.services.report_service import ReportService
from app.security.deps import CurrentUserContext, require_permissions

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/sales-summary", response_model=StandardResponse[SalesSummaryReport])
async def get_sales_summary(
    branch_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("reports:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = ReportService(db, context.organization_id)
    report = await service.get_sales_summary(branch_id=b_id, start_date=start_date, end_date=end_date)
    return StandardResponse(data=report)

@router.get("/inventory-valuation", response_model=StandardResponse[InventoryValuationReport])
async def get_inventory_valuation(
    branch_id: Optional[UUID] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("reports:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = ReportService(db, context.organization_id)
    val = await service.get_inventory_valuation(branch_id=b_id)
    return StandardResponse(data=val)

@router.get("/dashboard", response_model=StandardResponse[dict])
async def get_dashboard_summary(
    branch_id: Optional[UUID] = Query(None),
    context: CurrentUserContext = Depends(require_permissions("reports:read")),
    db: AsyncSession = Depends(get_db)
):
    b_id = branch_id or context.selected_branch_id
    service = ReportService(db, context.organization_id)
    summary = await service.get_sales_summary(branch_id=b_id)
    return StandardResponse(
        data={
            "total_sales_amount": summary.total_sales,
            "total_tickets": summary.transaction_count,
            "total_tax_collected": summary.total_taxes,
            "total_discounts": summary.total_discounts
        }
    )
