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
  organization_id?: string;
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
  created_at: string;
  items_count: number;
  status: "COMPLETED" | "CANCELLED";
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