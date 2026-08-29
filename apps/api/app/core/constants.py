from enum import Enum

class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    OWNER = "owner"
    MANAGER = "manager"
    CASHIER = "cashier"
    INVENTORY_STAFF = "inventory_staff"

class IdentificationType(str, Enum):
    FISICA = "FISICA"
    JURIDICA = "JURIDICA"
    DIMEX = "DIMEX"
    NITE = "NITE"
    EXTRANJERO = "EXTRANJERO"

class Currency(str, Enum):
    CRC = "CRC"
    USD = "USD"

class InventoryMovementType(str, Enum):
    IN_PURCHASE = "IN_PURCHASE"
    OUT_SALE = "OUT_SALE"
    ADJUSTMENT_IN = "ADJUSTMENT_IN"
    ADJUSTMENT_OUT = "ADJUSTMENT_OUT"
    RETURN_IN = "RETURN_IN"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    WASTE = "WASTE"

class PaymentMethod(str, Enum):
    CASH_CRC = "CASH_CRC"
    CASH_USD = "CASH_USD"
    CARD = "CARD"
    SINPE = "SINPE"
    TRANSFER = "TRANSFER"
    MIXED = "MIXED"

ROLE_PERMISSIONS = {
    UserRole.SUPERADMIN: ["*"],
    UserRole.OWNER: [
        "org:read", "org:update",
        "branch:read", "branch:create", "branch:update", "branch:delete",
        "user:read", "user:create", "user:update", "user:delete",
        "catalog:read", "catalog:create", "catalog:update", "catalog:delete",
        "inventory:read", "inventory:adjust", "inventory:transfer",
        "pos:read", "pos:sell", "pos:discount_high", "pos:refund",
        "cash:open", "cash:close", "cash:view_all", "cash:adjust",
        "reports:read", "reports:export",
        "invoicing:read", "invoicing:manage",
        "audit:read"
    ],
    UserRole.MANAGER: [
        "org:read", "branch:read", "user:read", "user:create", "user:update",
        "catalog:read", "catalog:create", "catalog:update",
        "inventory:read", "inventory:adjust", "inventory:transfer",
        "pos:read", "pos:sell", "pos:discount_high", "pos:refund",
        "cash:open", "cash:close", "cash:view_all",
        "reports:read", "invoicing:read", "audit:read"
    ],
    UserRole.CASHIER: [
        "branch:read", "catalog:read", "pos:read", "pos:sell", "pos:discount_low",
        "cash:open", "cash:close", "invoicing:read"
    ],
    UserRole.INVENTORY_STAFF: [
        "branch:read", "catalog:read", "catalog:create", "catalog:update",
        "inventory:read", "inventory:adjust", "inventory:transfer"
    ]
}
