from fastapi import APIRouter
from app.api.v1 import (
    auth,
    organizations,
    branches,
    users,
    superadmin,
    health,
    categories,
    tax_rates,
    products,
    inventory,
    sales,
    cash_registers,
    customers,
    invoices,
    reports,
    audit,
    subscription
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(organizations.router)
api_v1_router.include_router(branches.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(superadmin.router)
api_v1_router.include_router(categories.router)
api_v1_router.include_router(tax_rates.router)
api_v1_router.include_router(products.router)
api_v1_router.include_router(inventory.router)
api_v1_router.include_router(sales.router)
api_v1_router.include_router(cash_registers.router)
api_v1_router.include_router(customers.router)
api_v1_router.include_router(invoices.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(audit.router)
api_v1_router.include_router(subscription.router)
