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