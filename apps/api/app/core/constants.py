from enum import StrEnum
from typing import Dict, List, Set

class UserRole(StrEnum):
    SUPERADMIN = "superadmin"
    PLATFORM_SUPPORT = "platform_support"
    OWNER = "owner"
    MANAGER = "manager"
    CASHIER = "cashier"
    ACCOUNTANT = "accountant"
    INVENTORY_STAFF = "inventory_staff"

# Explicit role assignment permission matrix
ASSIGNABLE_ROLES: Dict[UserRole, Set[UserRole]] = {
    UserRole.SUPERADMIN: {
        UserRole.SUPERADMIN,
        UserRole.PLATFORM_SUPPORT,
        UserRole.OWNER,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.ACCOUNTANT,
        UserRole.INVENTORY_STAFF
    },
    UserRole.PLATFORM_SUPPORT: set(),
    UserRole.OWNER: {
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.ACCOUNTANT,
        UserRole.INVENTORY_STAFF
    },
    UserRole.MANAGER: {
        UserRole.CASHIER,
        UserRole.INVENTORY_STAFF
    },
    UserRole.CASHIER: set(),
    UserRole.ACCOUNTANT: set(),
    UserRole.INVENTORY_STAFF: set(),
}

class IdentificationTypeCR(StrEnum):
    FISICA = "01"              # 9 digits (Cédula de identidad)
    JURIDICA = "02"            # 10 digits (Cédula jurídica)
    DIMEX = "03"               # 11 or 12 digits (Documento de Identificación Migración y Extranjería)
    NITE = "04"                # 10 digits (Número de Identificación Tributario Especial)
    EXTRANJERO = "05"          # Variable (Pasaporte / Extranjero)

class TaxRateCodeCR(StrEnum):
    GENERAL_13 = "01"          # 13% General
    REDUCED_4 = "02"           # 4% (Medicamentos, boletos aéreos)
    REDUCED_2 = "03"           # 2% (Medicamentos veterinarios, insumos agro)
    REDUCED_1 = "04"           # 1% (Canasta Básica)
    REDUCED_0_5 = "05"         # 0.5% (Maquinaria y equipo agrícola)
    EXEMPT = "08"              # 0% (Exento)

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
    CASH_CRC = "01"            # Efectivo
    CARD = "02"                # Tarjeta
    CHECK = "03"               # Cheque
    SINPE_TRANSFER = "04"      # Transferencia / SINPE Móvil
    THIRD_PARTY = "05"         # Recaudado por terceros
    OTHER = "99"               # Otros

class InvoiceDocTypeCR(StrEnum):
    FACTURA_ELECTRONICA = "01"
    NOTA_DEBITO = "02"
    NOTA_CREDITO = "03"
    TIQUETE_ELECTRONICO = "04"

ROLE_PERMISSIONS: Dict[UserRole, List[str]] = {
    UserRole.SUPERADMIN: ["*"],
    UserRole.PLATFORM_SUPPORT: [
        "tenants:view", "support:manage", "audit:view"
    ],
    UserRole.OWNER: [
        "org:read", "org:update",
        "branch:read", "branch:create", "branch:update", "branch:delete",
        "user:read", "user:create", "user:update", "user:delete",
        "catalog:read", "catalog:create", "catalog:update", "catalog:delete",
        "inventory:read", "inventory:adjust", "inventory:transfer",
        "pos:read", "pos:sell", "pos:discount_high", "pos:refund",
        "cash:open", "cash:close", "cash:view_all", "cash:adjust", "cash:manage",
        "customers:read", "customers:create", "customers:update", "customers:delete",
        "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
        "purchases:read", "purchases:create",
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
        "suppliers:read", "suppliers:create",
        "reports:read", "invoicing:read", "audit:read"
    ],
    UserRole.CASHIER: [
        "branch:read", "catalog:read", "pos:read", "pos:sell", "pos:discount_low",
        "cash:open", "cash:close", "customers:read", "customers:create", "invoicing:read"
    ],
    UserRole.ACCOUNTANT: [
        "org:read", "branch:read", "reports:read", "reports:export",
        "invoicing:read", "invoicing:manage", "purchases:read", "audit:read"
    ],
    UserRole.INVENTORY_STAFF: [
        "branch:read", "catalog:read", "catalog:create", "catalog:update",
        "inventory:read", "inventory:adjust", "inventory:transfer", "suppliers:read"
    ]
}
