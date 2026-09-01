export interface Organization {
  id: string;
  legal_name: string;
  trade_name: string;
  identification_type: "FISICA" | "JURIDICA" | "DIMEX" | "NITE";
  identification_number: string;
  email: string;
  phone: string;
  country_code: string;
  default_currency: "CRC" | "USD";
  tax_regime?: "TRADICIONAL" | "SIMPLIFICADO";
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: "superadmin" | "owner" | "manager" | "cashier" | "cajero" | "inventory_staff";
  organization_id?: string | null;
  organization_name?: string | null;
  legal_name?: string | null;
  identification_number?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  accessible_branches: string[];
  permissions: string[];
}

export interface Branch {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  sale_price: number;
  cost_price: number;
  min_stock_alert: number;
  tax_rate: number;
  category_name?: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  identification_type: "FISICA" | "JURIDICA" | "DIMEX" | "EXTRANJERO";
  identification_number: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  legal_id: string;
  legal_id_type: "JURIDICA" | "FISICA" | "DIMEX";
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}

export interface PurchaseRecord {
  id: string;
  organization_id: string;
  supplier_name: string;
  invoice_number: string;
  payment_type: "CONTADO" | "CREDITO";
  total_amount: number;
  items_count: number;
  created_at: string;
  status: "RECEIVED";
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  created_at: string;
  product_name: string;
  movement_type: "IN_PURCHASE" | "OUT_SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "WASTE";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  actor_name: string;
  reason?: string;
}

export interface SaleItemSnapshot {
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface SaleRecord {
  id: string;
  organization_id: string;
  sale_number: string;
  consecutive_number: string;
  numeric_key: string;
  total: number;
  subtotal: number;
  tax: number;
  payment_method: "CASH_CRC" | "SINPE" | "CARD" | "MIXED";
  customer_name: string;
  customer_cedula?: string | null;
  created_at: string;
  items_count: number;
  status: "COMPLETED" | "CANCELLED";
  /** Real item-level data for reprinting exact receipts */
  items_snapshot?: SaleItemSnapshot[];
  /** Full receipt payload, serialized for instant reprint */
  receipt_data?: any;
}


export interface InvoiceRecord {
  id: string;
  organization_id: string;
  doc_type: "01" | "04" | "03";
  doc_type_label: string;
  consecutive_number: string;
  numeric_key: string;
  created_at: string;
  customer_name: string;
  total: number;
  status: "ACCEPTED" | "PENDING" | "REJECTED";
  hacienda_message?: string;
  xml_signed?: string;
}

export interface CashSession {
  id: string;
  organization_id: string;
  opened_at: string;
  closed_at?: string | null;
  initial_amount: number;
  cash_sales: number;
  sinpe_sales: number;
  card_sales: number;
  total_sales: number;
  status: "OPEN" | "CLOSED";
  actual_cash?: number;
  cash_difference?: number;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  created_at: string;
  actor_name: string;
  action: string;
  resource: string;
  ip_address: string;
}

export interface Employee {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: "CASHIER" | "MANAGER" | "INVENTORY" | "ADMIN";
  branch_name: string;
  pin?: string;
  is_active: boolean;
  created_at: string;
}

export interface QuoteItem {
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
}

export interface Quote {
  id: string;
  organization_id: string;
  quote_number: string;
  customer_name: string;
  customer_identification?: string;
  customer_email?: string;
  customer_phone?: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  valid_until: string;
  notes?: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CONVERTED";
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  expense_number: string;
  category: "ALQUILER" | "SERVICIOS" | "SALARIOS" | "PROVEEDORES" | "SUMINISTROS" | "IMPUESTOS" | "MANTENIMIENTO" | "OTROS";
  description: string;
  amount: number;
  payment_method: "CASH_CRC" | "SINPE" | "TRANSFER" | "CARD";
  supplier_name?: string;
  invoice_ref?: string;
  branch_name: string;
  status: "PAID" | "PENDING";
  due_date?: string;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: "REPARACION" | "MANTENIMIENTO" | "INSTALACION" | "DIAGNOSTICO" | "CITA_SERVICIO" | "GARANTIA";
  item_description: string; // Equipo, vehículo o artículo
  issue_reported: string;
  diagnosis?: string;
  assigned_technician?: string;
  estimated_cost: number;
  advance_payment: number;
  status: "RECEIVED" | "IN_DIAGNOSIS" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED";
  branch_name: string;
  created_at: string;
  estimated_delivery?: string;
}

export interface DispatchOrder {
  id: string;
  organization_id: string;
  dispatch_number: string;
  sale_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  driver_name?: string;
  total_amount: number;
  payment_status: "PAID" | "PENDING_CASH" | "PENDING_SINPE";
  status: "PENDING" | "ASSIGNED" | "IN_ROUTE" | "DELIVERED" | "FAILED";
  notes?: string;
  created_at: string;
  delivered_at?: string;
}

export interface Coupon {
  id: string;
  organization_id: string;
  code: string;
  description: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  min_purchase: number;
  max_uses: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export interface LoyaltyMember {
  id: string;
  organization_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  points_balance: number;
  total_earned: number;
  tier: "BRONCE" | "PLATA" | "ORO" | "DIAMANTE";
  created_at: string;
}

export interface BankAccount {
  id: string;
  organization_id: string;
  bank_name: string;
  account_type: "CORRIENTE" | "AHORROS" | "SINPE_MOVIL";
  iban: string;
  currency: "CRC" | "USD";
  current_balance: number;
  account_holder: string;
  is_active: boolean;
}

export interface BankTransaction {
  id: string;
  organization_id: string;
  bank_account_id: string;
  transaction_type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER_IN" | "TRANSFER_OUT" | "SALE_RECONCILIATION" | "EXPENSE_PAYMENT";
  amount: number;
  description: string;
  reference_number?: string;
  created_at: string;
}

export interface SuspendedSale {
  id: string;
  organization_id: string;
  tag: string;
  items: CartItem[];
  customer_name?: string;
  created_at: string;
  subtotal: number;
  total: number;
}

export interface FoundersPromoConfig {
  is_active: boolean;
  discount_percentage: number;
  expires_at: string;
  max_claims: number;
  claimed_count: number;
}

export interface PricingPlanTier {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  isCustom?: boolean;
  monthlyPrice: number;
  annualPrice: number;
  foundersMonthlyPrice?: number;
  description: string;
  features: string[];
  limits: {
    users: string;
    branches: string;
    terminals: string;
    invoices: string;
  };
}