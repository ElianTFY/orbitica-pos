export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: "superadmin" | "owner" | "manager" | "cashier" | "inventory_staff";
  organization_id?: string | null;
  organization_name?: string | null;
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
  name: string;
  sku?: string | null;
  barcode?: string | null;
  sale_price: number;
  cost_price: number;
  min_stock_alert: number;
  tax_rate: number;
  category_name?: string;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}
