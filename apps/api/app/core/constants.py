from enum import StrEnum
from typing import Dict, List

class UserRole(StrEnum):
    SUPERADMIN = "superadmin"
    OWNER = "owner"
    MANAGER = "manager"
    CASHIER = "cashier"
    INVENTORY_STAFF = "inventory_staff"

class IdentificationTypeCR(StrEnum):
    FISICA = "FISICA"          # 9 digits
    JURIDICA = "JURIDICA"      # 10 digits
    DIMEX = "DIMEX"            # 11 or 12 digits
    NITE = "NITE"              # 10 digits
    EXTRANJERO = "EXTRANJERO"  # Variable

class TaxRateCodeCR(StrEnum):
    GENERAL_13 = "01"       # 13% General
    REDUCED_4 = "02"        # 4% (Medicamentos, boletos aéreos)
    REDUCED_2 = "03"        # 2% (Medicamentos veterinarios, insumos agro)
    REDUCED_1 = "04"        # 1% (Canasta Básica)
    EXEMPT = "08"           # 0% (Exento)

class InventoryMovementType(StrEnum):
    IN_PURCHASE = "IN_PURCHASE"
    OUT_SALE = "OUT_SALE"
    ADJUSTMENT_IN = "ADJUSTMENT_IN"
    ADJUSTMENT_OUT = "ADJUSTMENT_OUT"
    RETURN_IN = "RETURN_IN"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    WASTE = "WASTE"

class PaymentMethodEnum(StrEnum):
    CASH_CRC = "CASH_CRC"
    CASH_USD = "CASH_USD"
    CARD = "CARD"
    SINPE = "SINPE"
    TRANSFER = "TRANSFER"
    MIXED = "MIXED"

class InvoiceDocTypeCR(StrEnum):
    FACTURA_ELECTRONICA = "01"
    NOTA_DEBITO = "02"
    NOTA_CREDITO = "03"
    TIQUETE_ELECTRONICO = "04"

ROLE_PERMISSIONS: Dict[UserRole, List[str]] = {
    UserRole.SUPERADMIN: ["*"],
    UserRole.OWNER: [
        "org:read", "org:update",
        "branch:read", "branch:create", "branch:update", "branch:delete",
        "user:read", "user:create", "user:update", "user:delete",
        "catalog:read", "catalog:create", "catalog:update", "catalog:delete",
        "inventory:read", "inventory:adjust", "inventory:transfer",
        "pos:read", "pos:sell", "pos:discount_high", "pos:refund",
        "cash:open", "cash:close", "cash:view_all", "cash:adjust", "cash:manage",
        "customers:read", "customers:create", "customers:update", "customers:delete",
        "reports:read", "reports:export",
        "invoicing:read", "invoicing:create", "invoicing:manage",
        "audit:read"
    ],
    UserRole.MANAGER: [
        "org:read", "branch:read", "user:read", "user:create", "user:update",
        "catalog:read", "catalog:create", "catalog:update",
        "inventory:read", "inventory:adjust", "inventory:transfer",
        "pos:read", "pos:sell", "pos:discount_high", "pos:refund",
        "cash:open", "cash:close", "cash:view_all", "cash:adjust",
        "customers:read", "customers:create", "customers:update",
        "reports:read", "invoicing:read", "audit:read"
    ],
    UserRole.CASHIER: [
        "branch:read", "catalog:read", "pos:read", "pos:sell", "pos:discount_low",
        "cash:open", "cash:close", "customers:read", "customers:create", "invoicing:read"
    ],
    UserRole.INVENTORY_STAFF: [
        "branch:read", "catalog:read", "catalog:create", "catalog:update",
        "inventory:read", "inventory:adjust", "inventory:transfer"
    ]
}
