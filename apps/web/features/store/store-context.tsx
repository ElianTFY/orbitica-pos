"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api-client";
import {
  Product,
  Customer,
  Supplier,
  PurchaseRecord,
  InventoryMovement,
  SaleRecord,
  InvoiceRecord,
  CashSession,
  AuditLogEntry,
  Employee,
  Branch,
  Quote,
  Expense,
  WorkOrder,
  DispatchOrder,
  Coupon,
  LoyaltyMember,
  BankAccount,
  BankTransaction,
  SuspendedSale,
  CartItem,
  FoundersPromoConfig,
  SubscriptionDetails,
  SubscriptionState,
  OnboardingProgress,
  ImportBatch,
  SupportTicket,
  SupportAccessGrant,
  TenantHealthAlert,
} from "@/types";

export interface BusinessSettings {
  trade_name: string;
  legal_name: string;
  identification_number: string;
  identification_type: "01" | "02" | "03" | "04" | "05" | "FISICA" | "JURIDICA" | "DIMEX" | "NITE" | "EXTRANJERO";
  email: string;
  phone: string;
  address: string;
  branch_name: string;
  tax_regime: "TRADICIONAL" | "SIMPLIFICADO";
  default_currency: "CRC" | "USD";
  atv_environment: "STAGING" | "PRODUCTION";
  atv_username: string;
  economic_activity_code: string;
  province_code: string;
  canton_code: string;
  district_code: string;
  neighborhood_code: string;
}

interface StoreContextType {
  settings: BusinessSettings;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  movements: InventoryMovement[];
  sales: SaleRecord[];
  invoices: InvoiceRecord[];
  auditLogs: AuditLogEntry[];
  activeCashSession: CashSession | null;
  employees: Employee[];
  branches: Branch[];
  quotes: Quote[];
  expenses: Expense[];
  workOrders: WorkOrder[];
  dispatchOrders: DispatchOrder[];
  coupons: Coupon[];
  loyaltyMembers: LoyaltyMember[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  suspendedSales: SuspendedSale[];
  foundersPromo: FoundersPromoConfig;
  updateFoundersPromo: (config: Partial<FoundersPromoConfig>) => void;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  // Real State Machine Statuses
  fetchStatus: "idle" | "loading" | "error" | "empty" | "unauthorized" | "offline";
  isInitialLoading: boolean;
  errorMessage: string | null;
  retryFetch: () => Promise<void>;
  isOffline: boolean;
  fiscalContingencyNotice: string | null;
  // Control Center Extensions
  subscription: SubscriptionDetails;
  updateSubscription: (details: Partial<SubscriptionDetails>) => void;
  onboarding: OnboardingProgress;
  updateOnboarding: (progress: Partial<OnboardingProgress>) => void;
  importBatches: ImportBatch[];
  executeImportBatch: (batchMeta: Omit<ImportBatch, "id" | "created_at" | "is_reverted" | "records_created_ids">, items: any[]) => Promise<ImportBatch>;
  revertImportBatch: (batchId: string) => Promise<boolean>;
  supportTickets: SupportTicket[];
  createSupportTicket: (ticket: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at" | "messages">, initialMessage: string) => Promise<SupportTicket>;
  addSupportMessage: (ticketId: string, message: string, isInternal?: boolean) => Promise<void>;
  activeSupportGrant: SupportAccessGrant | null;
  grantSupportAccess: (reason: string, durationMinutes: number, permission: "READ_ONLY" | "FULL_ADMIN") => Promise<SupportAccessGrant>;
  revokeSupportAccess: (grantId?: string) => Promise<void>;
  healthAlerts: TenantHealthAlert[];
  resolveHealthAlert: (alertId: string) => void;
  checkLimit: (resource: "products" | "users" | "branches" | "cajas") => { allowed: boolean; max: number; current: number; message?: string };
  purgeTestSales: () => number;
  // Products
  addProduct: (product: Omit<Product, "id" | "organization_id">) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // Customers
  addCustomer: (customer: Omit<Customer, "id" | "organization_id">) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  // Suppliers
  addSupplier: (supplier: Omit<Supplier, "id" | "organization_id">) => Promise<Supplier>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  // Employees
  addEmployee: (employee: Omit<Employee, "id" | "organization_id" | "created_at">) => Promise<Employee>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  // Branches
  addBranch: (branch: Omit<Branch, "id" | "organization_id" | "created_at">) => Promise<Branch>;
  updateBranch: (id: string, branch: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  // Quotes
  addQuote: (quote: Omit<Quote, "id" | "organization_id" | "quote_number" | "created_at">) => Promise<Quote>;
  updateQuote: (id: string, quote: Partial<Quote>) => void;
  deleteQuote: (id: string) => Promise<void>;
  // Expenses
  addExpense: (expense: Omit<Expense, "id" | "organization_id" | "expense_number" | "created_at">) => Expense;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  // Work Orders
  addWorkOrder: (order: Omit<WorkOrder, "id" | "organization_id" | "order_number" | "created_at">) => WorkOrder;
  updateWorkOrder: (id: string, order: Partial<WorkOrder>) => void;
  deleteWorkOrder: (id: string) => void;
  // Dispatch Orders
  addDispatchOrder: (order: Omit<DispatchOrder, "id" | "organization_id" | "dispatch_number" | "created_at">) => DispatchOrder;
  updateDispatchOrder: (id: string, order: Partial<DispatchOrder>) => void;
  deleteDispatchOrder: (id: string) => void;
  // Coupons & Loyalty
  addCoupon: (coupon: Omit<Coupon, "id" | "organization_id">) => Coupon;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  addLoyaltyPoints: (phone: string, customerName: string, points: number) => void;
  redeemLoyaltyPoints: (phone: string, points: number) => boolean;
  // Bank Accounts & Transactions
  addBankAccount: (account: Omit<BankAccount, "id" | "organization_id">) => BankAccount;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  addBankTransaction: (tx: Omit<BankTransaction, "id" | "organization_id" | "created_at">) => BankTransaction;
  // Suspended Sales
  suspendSale: (items: CartItem[], tag: string, customerName?: string) => SuspendedSale;
  resumeSale: (id: string) => SuspendedSale | null;
  deleteSuspendedSale: (id: string) => void;
  // Purchases & Inventory
  recordPurchase: (data: {
    supplierName: string;
    invoiceNumber: string;
    paymentType: "CONTADO" | "CREDITO";
    items: Array<{ productId?: string; productName: string; quantity: number; unitCost: number }>;
  }) => Promise<PurchaseRecord>;
  recordAdjustment: (data: {
    productId: string;
    productName: string;
    movementType: "IN_PURCHASE" | "OUT_SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "WASTE";
    quantity: number;
    reason?: string;
  }) => Promise<InventoryMovement>;
  // Sales & Cash
  recordSale: (saleData: {
    items: Array<{ product: Product; quantity: number; discountPercentage?: number }>;
    paymentMethod: "CASH_CRC" | "SINPE" | "CARD" | "MIXED";
    payments?: Array<{ payment_method: string; amount: number; reference_number?: string }>;
    cashReceived?: number;
    sinpeRef?: string;
    customerName?: string;
    customerCedula?: string;
    docType?: "04" | "01";
    isTest?: boolean;
  }) => Promise<{ sale: SaleRecord; invoice: InvoiceRecord; receiptData: any; fiscalWarning?: string }>;
  openCashSession: (initialAmount: number) => Promise<void>;
  closeCashSession: (actualCash?: number) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const numberValue = (value: unknown): number => Number(value ?? 0);

const mapApiProduct = (row: any): Product => ({
  id: String(row.id),
  organization_id: String(row.organization_id),
  name: row.name,
  sku: row.sku ?? null,
  barcode: row.barcode ?? null,
  sale_price: numberValue(row.sale_price),
  cost_price: numberValue(row.cost_price),
  min_stock_alert: numberValue(row.min_stock_alert),
  tax_rate: numberValue(row.tax_rate),
  tax_rate_id: row.tax_rate_id ? String(row.tax_rate_id) : undefined,
  category_id: row.category_id ? String(row.category_id) : null,
  category_name: row.category_name ?? "General",
  cabys_code: row.cabys_code,
  unit_of_measure: row.unit_of_measure,
  is_service: Boolean(row.is_service),
  stock: numberValue(row.current_stock),
});

const mapApiCustomer = (row: any): Customer => ({
  id: String(row.id),
  organization_id: String(row.organization_id),
  name: row.name,
  identification_type: row.identification_type,
  identification_number: row.identification_number ?? "",
  email: row.email ?? "",
  phone: row.phone ?? "",
  address: row.address ?? "",
  is_active: Boolean(row.is_active),
  created_at: row.created_at,
});

const mapApiQuote = (row: any): Quote => ({
  id: String(row.id), organization_id: String(row.organization_id), quote_number: row.quote_number,
  customer_name: row.customer_name || "Sin cliente identificado", status: row.status,
  created_at: row.created_at, valid_until: row.valid_until || "", notes: row.notes,
  subtotal: numberValue(row.subtotal_amount), discount: numberValue(row.discount_amount),
  tax_total: numberValue(row.tax_amount), total: numberValue(row.total_amount),
  items: (row.items || []).map((item: any) => ({
    product_id: String(item.product_id), name: item.product_name,
    quantity: numberValue(item.quantity), unit_price: numberValue(item.unit_price),
    tax_rate: numberValue(item.tax_rate), tax_amount: numberValue(item.tax_amount),
    subtotal: numberValue(item.line_total) - numberValue(item.tax_amount), total: numberValue(item.line_total),
  })),
});

const mapApiInvoice = (row: any): InvoiceRecord => ({
  id: String(row.id),
  organization_id: String(row.organization_id),
  sale_id: row.sale_id ? String(row.sale_id) : null,
  doc_type: row.doc_type,
  doc_type_label: row.doc_type === "01" ? "Factura Electrónica (01)" : row.doc_type === "03" ? "Nota de Crédito (03)" : "Tiquete Electrónico (04)",
  consecutive_number: row.consecutive_number,
  numeric_key: row.numeric_key,
  created_at: row.created_at,
  customer_name: row.receiver_name || "CLIENTE CONTADO",
  total: numberValue(row.total_amount),
  status: row.status,
  environment: row.environment,
  hacienda_message: row.hacienda_error_message || row.hacienda_status_code || undefined,
});

const mapApiSale = (row: any, invoice?: InvoiceRecord): SaleRecord => ({
  id: String(row.id),
  organization_id: String(row.organization_id),
  sale_number: row.sale_number,
  consecutive_number: invoice?.consecutive_number || "",
  numeric_key: invoice?.numeric_key || "",
  total: numberValue(row.total_amount),
  subtotal: numberValue(row.subtotal_amount),
  tax: numberValue(row.tax_amount),
  payment_method: row.payments?.[0]?.payment_method || "CASH_CRC",
  customer_name: row.customer_name || invoice?.customer_name || "CLIENTE CONTADO",
  created_at: row.created_at,
  items_count: (row.items || []).reduce((sum: number, item: any) => sum + numberValue(item.quantity), 0),
  status: row.status,
  items_snapshot: (row.items || []).map((item: any) => ({
    name: item.product_name,
    quantity: numberValue(item.quantity),
    unit_price: numberValue(item.unit_price),
    tax_rate: numberValue(item.tax_rate),
    tax_amount: numberValue(item.tax_amount),
    total: numberValue(item.line_total),
  })),
});

const mapApiCashSession = (row: any): CashSession => ({
  id: String(row.id),
  organization_id: "",
  branch_id: row.branch_id,
  cash_register_id: String(row.cash_register_id),
  opened_at: row.opened_at,
  closed_at: row.closed_at,
  initial_amount: numberValue(row.initial_cash_amount),
  cash_sales: numberValue(row.cash_sales),
  sinpe_sales: numberValue(row.sinpe_sales),
  card_sales: numberValue(row.card_sales),
  total_sales: numberValue(row.total_sales),
  cash_inflows: numberValue(row.cash_inflows),
  cash_outflows: numberValue(row.cash_outflows),
  expected_cash_amount: numberValue(row.expected_cash_amount),
  status: row.status,
  actual_cash: row.actual_cash_amount == null ? undefined : numberValue(row.actual_cash_amount),
  cash_difference: row.cash_difference == null ? undefined : numberValue(row.cash_difference),
});

const mapApiMovement = (row: any): InventoryMovement => ({
  id: String(row.id),
  organization_id: String(row.organization_id),
  created_at: row.created_at,
  product_name: row.product_name || "Producto",
  movement_type: row.movement_type,
  quantity: numberValue(row.quantity),
  previous_quantity: numberValue(row.previous_quantity),
  new_quantity: numberValue(row.new_quantity),
  actor_name: row.actor_name || "Usuario",
  reason: row.reason || undefined,
});

const mapApiSupportTicket = (
  row: any,
  fallback: { organizationId: string; organizationName: string; userName: string; userEmail: string },
): SupportTicket => ({
  id: String(row.id),
  ticket_number: row.ticket_number,
  organization_id: String(row.organization_id || fallback.organizationId),
  organization_name: row.organization_name || fallback.organizationName,
  created_by_name: row.created_by_name || fallback.userName,
  created_by_email: row.created_by_email || fallback.userEmail,
  category: row.category,
  priority: row.priority,
  status: row.status,
  subject: row.subject,
  description: row.description,
  telemetry: row.telemetry || undefined,
  messages: (row.messages || []).map((message: any) => ({
    id: String(message.id),
    sender_type: message.sender_type,
    sender_name: message.sender_name,
    message: message.message,
    is_internal_note: Boolean(message.is_internal_note),
    created_at: message.created_at,
  })),
  created_at: row.created_at,
  updated_at: row.updated_at || row.created_at,
});

const employeeRoles: Record<string, Employee["role"]> = {
  owner: "ADMIN", manager: "MANAGER", cashier: "CASHIER", inventory_staff: "INVENTORY", accountant: "ACCOUNTANT",
};
const apiEmployeeRoles: Record<string, string> = { MANAGER: "manager", CASHIER: "cashier", INVENTORY: "inventory_staff", ACCOUNTANT: "accountant" };
const mapApiEmployee = (row: any, branchRows: Branch[]): Employee => ({
  id: String(row.id), organization_id: String(row.organization_id), full_name: row.full_name,
  email: row.email, phone: row.phone || "", role: employeeRoles[row.role] || "CASHIER",
  branch_ids: row.branch_ids || [], branch_name: branchRows.find(b => row.branch_ids?.includes(b.id))?.name || "Sin asignar",
  is_active: row.is_active, created_at: row.created_at,
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Discard all tenant/user state on sign-out or account change, including any
  // late responses from the previous provider instance.
  return <BusinessStoreProvider key={`${user?.id || "anonymous"}:${user?.organization_id || "none"}`}>
    {children}
  </BusinessStoreProvider>;
}

function BusinessStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Empty while unauthenticated; protected owner routes only invoke mutations after auth.
  const orgId = user?.organization_id || "";

  const [settings, setSettings] = useState<BusinessSettings>({
    trade_name: user?.organization_name || "",
    legal_name: user?.legal_name || user?.organization_name || "",
    identification_number: user?.identification_number || "",
    identification_type: "02",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
    branch_name: user?.branch_name || "Sucursal Principal",
    tax_regime: "TRADICIONAL",
    default_currency: "CRC",
    atv_environment: "STAGING",
    atv_username: "",
    economic_activity_code: "",
    province_code: "",
    canton_code: "",
    district_code: "",
    neighborhood_code: "",
  });

  // Zero-mock initial empty states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrder[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [foundersPromo, setFoundersPromo] = useState<FoundersPromoConfig>({
    is_active: true,
    discount_percentage: 20,
    expires_at: "2026-10-31",
    max_claims: 50,
    claimed_count: 18,
  });
  const [activeCashSession, setActiveCashSession] = useState<CashSession | null>(null);

  // Control Center state
  const [subscription, setSubscription] = useState<SubscriptionDetails>(() => {
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    return {
      plan_id: "crece", // Full trial gets Crece features
      state: "trial",
      trial_start_at: now.toISOString().split("T")[0],
      trial_end_at: trialEnd.toISOString().split("T")[0],
      current_period_start: now.toISOString().split("T")[0],
      current_period_end: trialEnd.toISOString().split("T")[0],
      billing_cycle: "monthly",
      founders_discount_applied: false,
      amount: 0,
      currency: "CRC",
      cancel_at_period_end: false,
      scheduled_downgrade_plan_id: null,
      invoices: [],
    };
  });

  const [onboarding, setOnboarding] = useState<OnboardingProgress>({
    current_step: 1,
    is_completed: false,
    steps: {
      business: false,
      fiscal: false,
      branches: false,
      payments: false,
      products: false,
      contacts: false,
      users: false,
      test_sale: false,
    },
    last_saved_at: new Date().toISOString(),
  });

  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [activeSupportGrant, setActiveSupportGrant] = useState<SupportAccessGrant | null>(null);
  const [healthAlerts, setHealthAlerts] = useState<TenantHealthAlert[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fetchGeneration = useRef(0);

  // Sync settings when user context changes
  useEffect(() => {
    if (user) {
      setSettings((prev) => ({
        ...prev,
        trade_name: user.organization_name || prev.trade_name,
        legal_name: user.legal_name || user.organization_name || prev.legal_name,
        identification_number: user.identification_number || prev.identification_number,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        branch_name: user.branch_name || prev.branch_name,
      }));
    }
  }, [user]);

  // Real State Machine Statuses
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "error" | "empty" | "unauthorized" | "offline">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [fiscalContingencyNotice, setFiscalContingencyNotice] = useState<string | null>(null);

  const permissionsKey = (user?.permissions || []).join("|");

  // Authoritative Backend API Sync
  const fetchBusinessData = useCallback(async () => {
    if (!orgId) return;
    const generation = ++fetchGeneration.current;
    setFetchStatus("loading");
    setErrorMessage(null);

    try {
      const permissions = new Set(permissionsKey.split("|"));
      const allowed = (permission: string) => permissions.has("*") || permissions.has(permission);
      const request = <T,>(path: string, permission: string, empty: T) =>
        allowed(permission) ? api.request<T>(path) : Promise.resolve({ success: true, data: empty });
      const loadCatalog = async () => {
        if (!allowed("catalog:read")) return { success: true, data: [] };
        const rows: any[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = await api.request<any[]>(`/products?limit=200&offset=${offset}`);
          rows.push(...page.data);
          if (page.data.length < 200) return { success: true, data: rows };
        }
      };
      const [productsRes, customersRes, invoicesRes, salesRes, purchasesRes, movementsRes, cashRes, supportRes, grantRes, branchesRes, suppliersRes, orgRes, auditRes, onbRes, subRes, quotesRes, usersRes] =
        await Promise.allSettled([
          loadCatalog(),
          request<any[]>("/customers", "customers:read", []),
          request<any[]>("/invoices", "invoicing:read", []),
          request<any[]>("/sales", "pos:read", []),
          request<any[]>("/purchases", "purchases:read", []),
          request<any[]>("/inventory/movements?limit=100", "inventory:read", []),
          request<any>("/cash-registers/sessions/active", "cash:open", null),
          api.request<any[]>("/support/tickets"),
          request<any>("/support/delegated-access/active", "org:update", null),
          request<any[]>("/branches", "branch:read", []),
          request<any[]>("/suppliers?is_active=true", "suppliers:read", []),
          request<any>("/organizations/me", "org:read", null),
          request<any[]>("/audit?limit=100", "audit:read", []),
          request<any>("/organizations/onboarding", "org:read", null),
          request<any>("/subscription/current", "org:read", null),
          request<any[]>("/quotes", "pos:read", []),
          request<any[]>("/users", "user:read", []),
        ]);

      if (generation !== fetchGeneration.current) return;
      if (usersRes.status === "fulfilled" && branchesRes.status === "fulfilled") {
        setEmployees(usersRes.value.data.map(row => mapApiEmployee(row, branchesRes.value.data)));
      }
      const critical = [productsRes, invoicesRes, salesRes, movementsRes, cashRes, branchesRes];
      const criticalFailure = critical.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      if (criticalFailure) throw criticalFailure.reason;

      let hasData = false;

      if (orgRes.status === "fulfilled" && orgRes.value?.data) {
        const o = orgRes.value.data;
        setSettings((prev) => ({
          ...prev,
          trade_name: o.trade_name || prev.trade_name,
          legal_name: o.legal_name || prev.legal_name,
          identification_number: o.identification_number || prev.identification_number,
          identification_type: o.identification_type || prev.identification_type,
          email: o.email || prev.email,
          phone: o.phone || prev.phone,
          address: o.address_detail || prev.address,
          default_currency: o.default_currency || prev.default_currency,
        }));
      }

      if (onbRes.status === "fulfilled" && onbRes.value?.data) {
        const onb = onbRes.value.data;
        setOnboarding((prev) => ({
          ...prev,
          current_step: onb.current_step,
          is_completed: onb.is_completed,
          steps: {
            business: onb.business_data_completed,
            fiscal: onb.fiscal_data_completed,
            branches: onb.branches_completed,
            payments: onb.payments_completed,
            products: onb.products_completed,
            contacts: onb.contacts_completed,
            users: onb.users_completed,
            test_sale: false,
          },
          last_saved_at: onb.updated_at || new Date().toISOString(),
        }));
      }

      if (subRes.status === "fulfilled" && subRes.value?.data) {
        const s = subRes.value.data;
        setSubscription((prev) => ({
          ...prev,
          plan_id: s.plan_name?.toLowerCase().includes("pro") ? "crece" : "inicio",
          state: s.status === "ACTIVE" ? "active" : "trial",
          amount: Number(s.price_monthly) || 0,
          currency: s.currency || "CRC",
        }));
      }

      if (branchesRes.status === "fulfilled" && branchesRes.value?.data) {
        setBranches(branchesRes.value.data);
      }

      if (productsRes.status === "fulfilled" && productsRes.value?.data) {
        setProducts(productsRes.value.data.map(mapApiProduct));
        if (productsRes.value.data.length > 0) hasData = true;
      }
      if (customersRes.status === "fulfilled" && customersRes.value?.data) {
        setCustomers(customersRes.value.data.map(mapApiCustomer));
      }
      if (invoicesRes.status === "fulfilled" && invoicesRes.value?.data) {
        setInvoices(invoicesRes.value.data.map(mapApiInvoice));
      }
      if (salesRes.status === "fulfilled" && salesRes.value?.data) {
        const mappedInvoices = invoicesRes.status === "fulfilled" ? invoicesRes.value.data.map(mapApiInvoice) : [];
        setSales(salesRes.value.data.map((sale: any) => mapApiSale(
          sale,
          mappedInvoices.find((invoice) => invoice.sale_id === String(sale.id) && ["01", "04"].includes(invoice.doc_type)),
        )));
        if (salesRes.value.data.length > 0) hasData = true;
      }
      if (purchasesRes.status === "fulfilled" && purchasesRes.value?.data) {
        const supplierRows = suppliersRes.status === "fulfilled" ? suppliersRes.value.data : [];
        setPurchases(purchasesRes.value.data.map((row: any) => ({
          id: String(row.id),
          organization_id: String(row.organization_id),
          supplier_name: supplierRows.find((supplier: any) => String(supplier.id) === String(row.supplier_id))?.name || "Proveedor",
          invoice_number: row.invoice_number || row.purchase_number,
          payment_type: row.payment_method === "CREDITO" ? "CREDITO" : "CONTADO",
          total_amount: numberValue(row.total_amount),
          items_count: (row.items || []).reduce((sum: number, item: any) => sum + numberValue(item.quantity), 0),
          created_at: row.created_at,
          status: row.status === "CANCELLED" ? "CANCELLED" : "COMPLETED",
        })));
      }
      if (movementsRes.status === "fulfilled" && movementsRes.value?.data) {
        setMovements(movementsRes.value.data.map(mapApiMovement));
      }
      if (cashRes.status === "fulfilled") {
        setActiveCashSession(cashRes.value?.data ? mapApiCashSession(cashRes.value.data) : null);
      }
      if (supportRes.status === "fulfilled" && supportRes.value?.data) {
        const fallback = {
          organizationId: orgId,
          organizationName: orgRes.status === "fulfilled" ? orgRes.value?.data?.trade_name || "Mi Negocio" : "Mi Negocio",
          userName: user?.full_name || "Usuario",
          userEmail: user?.email || "",
        };
        const hydrated = await Promise.all(
          supportRes.value.data.map(async (summary: any) => {
            try {
              const detail = await api.request<any>(`/support/tickets/${summary.id}`);
              return mapApiSupportTicket(detail.data, fallback);
            } catch {
              return mapApiSupportTicket(summary, fallback);
            }
          }),
        );
        setSupportTickets(hydrated);
      }
      if (grantRes.status === "fulfilled") {
        const grant = grantRes.value?.data;
        setActiveSupportGrant(grant ? {
          id: String(grant.grant_id),
          organization_id: orgId,
          organization_name: orgRes.status === "fulfilled" ? orgRes.value?.data?.trade_name || "Mi Negocio" : "Mi Negocio",
          granted_by_user_id: user?.id || "",
          reason: grant.reason,
          permission_level: grant.permission_level,
          expires_at: grant.expires_at,
          created_at: grant.created_at,
          is_revoked: Boolean(grant.is_revoked),
        } : null);
      }
      if (branchesRes.status === "fulfilled" && branchesRes.value?.data) {
        setBranches(branchesRes.value.data);
      }
      if (suppliersRes.status === "fulfilled" && suppliersRes.value?.data) {
        setSuppliers(suppliersRes.value.data.map((row: any) => ({
          id: String(row.id),
          organization_id: String(row.organization_id),
          name: row.name,
          legal_id: row.identification_number,
          legal_id_type: row.identification_type,
          contact_person: row.trade_name || "",
          phone: row.phone || "",
          email: row.email || "",
          address: row.address || "",
          created_at: row.created_at,
        })));
      }
      if (orgRes.status === "fulfilled" && orgRes.value?.data) {
        const org = orgRes.value.data;
        setSettings((previous) => ({
          ...previous,
          trade_name: org.trade_name,
          legal_name: org.legal_name,
          identification_type: org.identification_type,
          identification_number: org.identification_number,
          email: org.email,
          phone: org.phone || "",
          address: org.address_detail || "",
          tax_regime: org.tax_regime,
          default_currency: org.default_currency,
          atv_environment: org.atv_environment,
          economic_activity_code: org.economic_activity_code || "",
          province_code: org.province_code || "",
          canton_code: org.canton_code || "",
          district_code: org.district_code || "",
          neighborhood_code: org.neighborhood_code || "",
          branch_name: branchesRes.status === "fulfilled" ? branchesRes.value.data[0]?.name || previous.branch_name : previous.branch_name,
        }));
      }
      if (auditRes.status === "fulfilled" && auditRes.value?.data) {
        setAuditLogs(auditRes.value.data.map((row: any) => ({
          id: String(row.id),
          organization_id: String(row.organization_id || orgId),
          created_at: row.created_at,
          actor_name: row.actor_id ? `Usuario ${String(row.actor_id).slice(0, 8)}` : "Sistema",
          action: row.action,
          resource: row.resource_id ? `${row.resource}: ${row.resource_id}` : row.resource,
          ip_address: row.ip_address || "—",
        })));
      }

      if (quotesRes.status === "fulfilled" && quotesRes.value?.data) {
        setQuotes(quotesRes.value.data.map(mapApiQuote));
      }

      setIsOffline(false);
      setFiscalContingencyNotice(null);
      setFetchStatus(hasData ? "idle" : "empty");
    } catch (err: any) {
      if (generation !== fetchGeneration.current) return;
      if (err?.status === 401) {
        setFetchStatus("unauthorized");
        setErrorMessage("Sesión no autorizada o expirada.");
      } else if (err?.status && err.status !== 408) {
        setFetchStatus("error");
        setErrorMessage(err.message || "No se pudieron cargar los datos autorizados.");
      } else {
        setFetchStatus("offline");
        setIsOffline(true);
        setFiscalContingencyNotice(
          "No hay conexión con el servidor. Este POS requiere conexión para guardar ventas. Los comprobantes ya guardados conservan su estado pendiente y el worker reintentará procesarlos."
        );
        setErrorMessage("Sin conexión con el backend central.");
      }
    } finally {
      if (generation === fetchGeneration.current) setIsLoaded(true);
    }
  }, [orgId, user?.email, user?.full_name, user?.id, permissionsKey]);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  // Persist only non-business UI draft preferences (promotions, draft cart)
  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;
    try {
      localStorage.setItem(`orbitica_suspended_${orgId}`, JSON.stringify(suspendedSales));
    } catch (e) {}
  }, [suspendedSales, orgId]);

  const logAudit = (action: string, resource: string) => {
    // Authoritative audit events are generated server-side with actor, IP and hash chain.
    void action;
    void resource;
  };

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    const allowedFields = [
      "legal_name", "trade_name", "identification_type", "identification_number",
      "email", "phone", "default_currency", "economic_activity_code",
      "province_code", "canton_code", "district_code", "neighborhood_code",
      "address_detail", "tax_regime", "atv_environment",
    ];
    const payload: Record<string, unknown> = {};
    const source = { ...newSettings, address_detail: newSettings.address } as Record<string, unknown>;
    allowedFields.forEach((field) => {
      if (source[field] !== undefined) payload[field] = source[field];
    });
    await api.request("/organizations/me", { method: "PATCH", body: JSON.stringify(payload) });
    setSettings((prev) => ({ ...prev, ...newSettings }));
    await fetchBusinessData();
  };

  // Products
  const resolveTaxRateId = async (rate: number): Promise<string> => {
    const response = await api.request<any[]>("/tax-rates");
    let tax = response.data.find((row) => numberValue(row.rate) === rate);
    if (!tax) {
      const created = await api.request<any>("/tax-rates", {
        method: "POST",
        body: JSON.stringify({ name: `IVA ${rate}%`, code_cr: "01", rate, is_default: false }),
      });
      tax = created.data;
    }
    return String(tax.id);
  };

  const resolveCategoryId = async (name?: string): Promise<string | null> => {
    if (!name?.trim()) return null;
    const response = await api.request<any[]>("/categories");
    let category = response.data.find((row) => row.name.toLowerCase() === name.trim().toLowerCase());
    if (!category) {
      category = (await api.request<any>("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      })).data;
    }
    return String(category.id);
  };

  const addProduct = async (prod: Omit<Product, "id" | "organization_id">): Promise<Product> => {
    if (!prod.cabys_code) throw new Error("Selecciona un código CAByS oficial antes de guardar.");
    const taxRateId = await resolveTaxRateId(prod.tax_rate);
    const categoryId = await resolveCategoryId(prod.category_name);
    const branchId = branches[0]?.id;
    const response = await api.request<any>("/products", {
      method: "POST",
      body: JSON.stringify({
        name: prod.name,
        sku: prod.sku || null,
        barcode: prod.barcode || null,
        category_id: categoryId,
        tax_rate_id: taxRateId,
        cabys_code: prod.cabys_code,
        unit_of_measure: prod.unit_of_measure || "Unid",
        cost_price: prod.cost_price,
        sale_price: prod.sale_price,
        min_stock_alert: prod.min_stock_alert,
        is_service: Boolean(prod.is_service),
        initial_stock: prod.stock || 0,
        branch_id: branchId || null,
      }),
    });
    await fetchBusinessData();
    return { ...mapApiProduct(response.data), stock: prod.stock || 0, tax_rate: prod.tax_rate, category_name: prod.category_name };
  };

  const updateProduct = async (id: string, updated: Partial<Product>) => {
    const existing = products.find((product) => product.id === id);
    if (!existing) throw new Error("Producto no encontrado.");
    const payload: Record<string, unknown> = {};
    for (const field of ["name", "sku", "barcode", "cabys_code", "unit_of_measure", "cost_price", "sale_price", "min_stock_alert", "is_service"] as const) {
      if (updated[field] !== undefined) payload[field] = updated[field];
    }
    if (updated.tax_rate !== undefined) payload.tax_rate_id = await resolveTaxRateId(updated.tax_rate);
    if (updated.category_name !== undefined) payload.category_id = await resolveCategoryId(updated.category_name);
    await api.request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

    if (updated.stock !== undefined && updated.stock !== existing.stock) {
      const branchId = branches[0]?.id;
      if (!branchId) throw new Error("No existe una sucursal activa para ajustar inventario.");
      const delta = updated.stock - existing.stock;
      await api.request("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          branch_id: branchId,
          product_id: id,
          quantity: delta,
          movement_type: delta >= 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          reason: "Ajuste desde edición de producto",
        }),
      });
    }
    await fetchBusinessData();
  };

  const deleteProduct = async (id: string) => {
    await api.request(`/products/${id}`, { method: "DELETE" });
    await fetchBusinessData();
  };

  // Customers
  const addCustomer = async (cust: Omit<Customer, "id" | "organization_id">): Promise<Customer> => {
    const response = await api.request<any>("/customers", {
      method: "POST",
      body: JSON.stringify(cust),
    });
    await fetchBusinessData();
    return mapApiCustomer(response.data);
  };

  const updateCustomer = async (id: string, updated: Partial<Customer>) => {
    await api.request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(updated) });
    await fetchBusinessData();
  };

  const deleteCustomer = async (id: string) => {
    await api.request(`/customers/${id}`, { method: "DELETE" });
    await fetchBusinessData();
  };

  // Suppliers
  const addSupplier = async (supp: Omit<Supplier, "id" | "organization_id">): Promise<Supplier> => {
    const response = await api.request<any>("/suppliers", {
      method: "POST",
      body: JSON.stringify({
        name: supp.name,
        identification_number: supp.legal_id,
        identification_type: supp.legal_id_type,
        trade_name: supp.contact_person || null,
        phone: supp.phone || null,
        email: supp.email || null,
        address: supp.address || null,
      }),
    });
    await fetchBusinessData();
    return {
      ...supp,
      id: String(response.data.id),
      organization_id: String(response.data.organization_id),
      created_at: response.data.created_at,
    };
  };

  const updateSupplier = async (id: string, updated: Partial<Supplier>) => {
    await api.request(`/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: updated.name,
        identification_number: updated.legal_id,
        identification_type: updated.legal_id_type,
        trade_name: updated.contact_person,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
      }),
    });
    await fetchBusinessData();
  };

  const deleteSupplier = async (id: string) => {
    await api.request(`/suppliers/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: false }) });
    await fetchBusinessData();
  };

  // Employee and branch mutations become visible only after the API commits.
  const employeeBranchIds = (emp: Partial<Employee>) => {
    const selected = branches.find(branch => branch.name === emp.branch_name);
    if (!selected) throw new Error("Seleccione una sucursal activa para el empleado.");
    return [selected.id];
  };
  const addEmployee = async (emp: Omit<Employee, "id" | "organization_id" | "created_at">): Promise<Employee> => {
    if (!emp.password || emp.password.length < 8) throw new Error("La contraseña inicial debe tener al menos 8 caracteres.");
    const role = apiEmployeeRoles[emp.role];
    if (!role) throw new Error("Seleccione un rol de empleado válido.");
    const result = await api.request<any>("/users", { method: "POST", body: {
      full_name: emp.full_name, email: emp.email, phone: emp.phone, role,
      password: emp.password, branch_ids: employeeBranchIds(emp),
    } });
    await fetchBusinessData();
    return mapApiEmployee(result.data, branches);
  };
  const updateEmployee = async (id: string, emp: Partial<Employee>) => {
    const body: Record<string, unknown> = { full_name: emp.full_name, phone: emp.phone, is_active: emp.is_active };
    if (emp.role && emp.role !== "ADMIN") body.role = apiEmployeeRoles[emp.role];
    if (emp.branch_name && id !== user?.id) body.branch_ids = employeeBranchIds(emp);
    await api.request(`/users/${id}`, { method: "PUT", body });
    await fetchBusinessData();
  };
  const deleteEmployee = async (id: string) => {
    await api.request(`/users/${id}`, { method: "PUT", body: { is_active: false } });
    await fetchBusinessData();
  };
  const addBranch = async (br: Omit<Branch, "id" | "organization_id" | "created_at">): Promise<Branch> => {
    const result = await api.request<Branch>("/branches", { method: "POST", body: br });
    await fetchBusinessData();
    return result.data;
  };
  const updateBranch = async (id: string, updated: Partial<Branch>) => {
    await api.request(`/branches/${id}`, { method: "PUT", body: updated });
    await fetchBusinessData();
  };
  const deleteBranch = async (id: string) => {
    await api.request(`/branches/${id}`, { method: "DELETE" });
    await fetchBusinessData();
  };

  // Quotes
  const addQuote = async (q: Omit<Quote, "id" | "organization_id" | "quote_number" | "created_at">): Promise<Quote> => {
    const customer = customers.find((c) => q.customer_identification ? c.identification_number === q.customer_identification : c.name.toLowerCase() === q.customer_name.toLowerCase());
    if (!customer) throw new Error("Registra al cliente en Clientes antes de crear su cotización.");
    const response = await api.request<any>("/quotes", { method: "POST", body: {
      branch_id: activeCashSession?.branch_id || branches[0]?.id,
      customer_id: customer.id,
      valid_days: Math.max(1, Math.min(90, Math.ceil((new Date(q.valid_until).getTime() - Date.now()) / 86400000))),
      notes: q.notes, items: q.items.map((item) => ({product_id: item.product_id, quantity: item.quantity, discount_percentage: 0})),
    }});
    const quote = mapApiQuote(response.data);
    await fetchBusinessData();
    return quote;
  };

  const updateQuote = (_id: string, _updated: Partial<Quote>) => {
    throw new Error("La edición de cotizaciones aún no está disponible. Crea una cotización nueva.");
  };

  const deleteQuote = async (id: string) => {
    await api.request(`/quotes/${id}`, {method: "DELETE"});
    await fetchBusinessData();
  };

  // Expenses
  const addExpense = (exp: Omit<Expense, "id" | "organization_id" | "expense_number" | "created_at">): Expense => {
    const num = `GAS-${String(Date.now()).slice(-6)}`;
    const newExpense: Expense = {
      ...exp,
      id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      expense_number: num,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    logAudit("EXPENSE_CREATED", `Gasto: ${newExpense.expense_number} (₡${newExpense.amount}) - ${newExpense.category}`);
    return newExpense;
  };

  const updateExpense = (id: string, updated: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updated } : e))
    );
    logAudit("EXPENSE_UPDATED", `Gasto ID: ${id}`);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    logAudit("EXPENSE_DELETED", `Gasto ID: ${id}`);
  };

  // Work Orders
  const addWorkOrder = (wo: Omit<WorkOrder, "id" | "organization_id" | "order_number" | "created_at">): WorkOrder => {
    const num = `OT-${String(Date.now()).slice(-6)}`;
    const newOrder: WorkOrder = {
      ...wo,
      id: `wo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      order_number: num,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    setWorkOrders((prev) => [newOrder, ...prev]);
    logAudit("WORK_ORDER_CREATED", `Orden de Servicio: ${newOrder.order_number} - ${newOrder.customer_name}`);
    return newOrder;
  };

  const updateWorkOrder = (id: string, updated: Partial<WorkOrder>) => {
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === id ? { ...wo, ...updated } : wo))
    );
    logAudit("WORK_ORDER_UPDATED", `Orden ID: ${id}`);
  };

  const deleteWorkOrder = (id: string) => {
    setWorkOrders((prev) => prev.filter((wo) => wo.id !== id));
    logAudit("WORK_ORDER_DELETED", `Orden ID: ${id}`);
  };

  // Dispatch Orders
  const addDispatchOrder = (dsp: Omit<DispatchOrder, "id" | "organization_id" | "dispatch_number" | "created_at">): DispatchOrder => {
    const num = `DSP-${String(Date.now()).slice(-6)}`;
    const newDispatch: DispatchOrder = {
      ...dsp,
      id: `dsp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      dispatch_number: num,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    setDispatchOrders((prev) => [newDispatch, ...prev]);
    logAudit("DISPATCH_CREATED", `Despacho: ${newDispatch.dispatch_number} - ${newDispatch.customer_name}`);
    return newDispatch;
  };

  const updateDispatchOrder = (id: string, updated: Partial<DispatchOrder>) => {
    setDispatchOrders((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
    );
    logAudit("DISPATCH_UPDATED", `Despacho ID: ${id}`);
  };

  const deleteDispatchOrder = (id: string) => {
    setDispatchOrders((prev) => prev.filter((d) => d.id !== id));
    logAudit("DISPATCH_DELETED", `Despacho ID: ${id}`);
  };

  // Coupons & Loyalty
  const addCoupon = (coup: Omit<Coupon, "id" | "organization_id">): Coupon => {
    const newCoupon: Coupon = {
      ...coup,
      code: coup.code.toUpperCase().trim(),
      id: `coup_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    logAudit("COUPON_CREATED", `Cupón: ${newCoupon.code}`);
    return newCoupon;
  };

  const updateCoupon = (id: string, updated: Partial<Coupon>) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    logAudit("COUPON_DELETED", `Cupón ID: ${id}`);
  };

  const addLoyaltyPoints = (phone: string, customerName: string, points: number) => {
    setLoyaltyMembers((prev) => {
      const existingIdx = prev.findIndex((m) => m.customer_phone === phone);
      if (existingIdx >= 0) {
        const member = prev[existingIdx];
        const newBalance = member.points_balance + points;
        const newEarned = member.total_earned + points;
        const tier = newEarned >= 5000 ? "DIAMANTE" : newEarned >= 1500 ? "ORO" : newEarned >= 500 ? "PLATA" : "BRONCE";
        const updated = [...prev];
        updated[existingIdx] = {
          ...member,
          points_balance: newBalance,
          total_earned: newEarned,
          tier,
        };
        return updated;
      } else {
        const tier = points >= 500 ? "PLATA" : "BRONCE";
        const newMember: LoyaltyMember = {
          id: `loy_${Date.now()}`,
          organization_id: orgId,
          customer_name: customerName,
          customer_phone: phone,
          points_balance: points,
          total_earned: points,
          tier,
          created_at: new Date().toISOString().replace("T", " ").substring(0, 10),
        };
        return [newMember, ...prev];
      }
    });
    logAudit("LOYALTY_POINTS_ADDED", `Puntos: +${points} para ${customerName} (${phone})`);
  };

  const redeemLoyaltyPoints = (phone: string, points: number): boolean => {
    let success = false;
    setLoyaltyMembers((prev) => {
      const existingIdx = prev.findIndex((m) => m.customer_phone === phone);
      if (existingIdx >= 0 && prev[existingIdx].points_balance >= points) {
        success = true;
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          points_balance: updated[existingIdx].points_balance - points,
        };
        return updated;
      }
      return prev;
    });
    if (success) {
      logAudit("LOYALTY_POINTS_REDEEMED", `Puntos canjeados: -${points} (${phone})`);
    }
    return success;
  };

  // Bank Accounts & Transactions
  const addBankAccount = (acc: Omit<BankAccount, "id" | "organization_id">): BankAccount => {
    const newAcc: BankAccount = {
      ...acc,
      id: `bank_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
    };
    setBankAccounts((prev) => [...prev, newAcc]);
    logAudit("BANK_ACCOUNT_CREATED", `Cuenta Bancaria: ${newAcc.bank_name} (${newAcc.iban})`);
    return newAcc;
  };

  const updateBankAccount = (id: string, updated: Partial<BankAccount>) => {
    setBankAccounts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
    );
  };

  const deleteBankAccount = (id: string) => {
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
    logAudit("BANK_ACCOUNT_DELETED", `Cuenta Bancaria ID: ${id}`);
  };

  const addBankTransaction = (tx: Omit<BankTransaction, "id" | "organization_id" | "created_at">): BankTransaction => {
    const newTx: BankTransaction = {
      ...tx,
      id: `btx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    setBankTransactions((prev) => [newTx, ...prev]);

    // Update account balance
    setBankAccounts((prev) =>
      prev.map((b) => {
        if (b.id === tx.bank_account_id) {
          const isCredit = ["DEPOSIT", "TRANSFER_IN", "SALE_RECONCILIATION"].includes(tx.transaction_type);
          const newBal = isCredit ? b.current_balance + tx.amount : b.current_balance - tx.amount;
          return { ...b, current_balance: newBal };
        }
        return b;
      })
    );

    logAudit("BANK_TRANSACTION_RECORDED", `Movimiento Bancario: ${tx.transaction_type} ₡${tx.amount}`);
    return newTx;
  };

  // Suspended Sales
  const suspendSale = (items: CartItem[], tag: string, customerName?: string): SuspendedSale => {
    const subtotal = items.reduce((acc, it) => acc + (it.product.sale_price * it.quantity * (1 - it.discountPercentage / 100)), 0);
    const tax = items.reduce((acc, it) => acc + (it.product.sale_price * it.quantity * (1 - it.discountPercentage / 100) * (it.product.tax_rate / 100)), 0);
    const suspended: SuspendedSale = {
      id: `susp_${Date.now()}`,
      organization_id: orgId,
      tag: tag || `Ticket #${suspendedSales.length + 1}`,
      items,
      customer_name: customerName,
      created_at: new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }),
      subtotal,
      total: subtotal + tax,
    };
    setSuspendedSales((prev) => [suspended, ...prev]);
    logAudit("SALE_SUSPENDED", `Venta en Espera: ${suspended.tag}`);
    return suspended;
  };

  const resumeSale = (id: string): SuspendedSale | null => {
    const found = suspendedSales.find((s) => s.id === id);
    if (found) {
      setSuspendedSales((prev) => prev.filter((s) => s.id !== id));
      logAudit("SALE_RESUMED", `Venta Recuperada: ${found.tag}`);
      return found;
    }
    return null;
  };

  const deleteSuspendedSale = (id: string) => {
    setSuspendedSales((prev) => prev.filter((s) => s.id !== id));
  };

  const updateFoundersPromo = (config: Partial<FoundersPromoConfig>) => {
    setFoundersPromo((prev) => {
      const next = { ...prev, ...config };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("orbitica_founders_promo", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    logAudit(
      "FOUNDERS_PROMO_UPDATED",
      `Promoción Fundadores: ${config.is_active !== undefined ? (config.is_active ? "Activa" : "Inactiva") : "Configuración actualizada"}`
    );
  };

  // Purchases & Inventory
  const recordPurchase = async ({
    supplierName,
    invoiceNumber,
    paymentType,
    items,
  }: {
    supplierName: string;
    invoiceNumber: string;
    paymentType: "CONTADO" | "CREDITO";
    items: Array<{ productId?: string; productName: string; quantity: number; unitCost: number }>;
  }): Promise<PurchaseRecord> => {
    const branchId = branches[0]?.id;
    const supplier = suppliers.find((row) => row.name === supplierName);
    if (!branchId) throw new Error("No existe una sucursal activa.");
    if (!supplier) throw new Error("Selecciona un proveedor registrado antes de guardar la compra.");
    if (items.some((item) => !item.productId)) throw new Error("Todos los renglones deben corresponder a productos registrados.");

    const response = await api.request<any>("/purchases", {
      method: "POST",
      body: JSON.stringify({
        branch_id: branchId,
        supplier_id: supplier.id,
        invoice_number: invoiceNumber,
        currency: settings.default_currency,
        payment_method: paymentType,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_cost: item.unitCost,
          tax_rate: products.find((product) => product.id === item.productId)?.tax_rate ?? 13,
        })),
      }),
    });
    await fetchBusinessData();
    return {
      id: String(response.data.id),
      organization_id: String(response.data.organization_id),
      supplier_name: supplier.name,
      invoice_number: response.data.invoice_number || response.data.purchase_number,
      payment_type: paymentType,
      total_amount: numberValue(response.data.total_amount),
      items_count: items.reduce((sum, item) => sum + item.quantity, 0),
      created_at: response.data.created_at,
      status: "COMPLETED",
    };
  };

  const recordAdjustment = async ({
    productId,
    productName,
    movementType,
    quantity,
    reason,
  }: {
    productId: string;
    productName: string;
    movementType: "IN_PURCHASE" | "OUT_SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "WASTE";
    quantity: number;
    reason?: string;
  }): Promise<InventoryMovement> => {
    const branchId = user?.branch_id || branches[0]?.id;
    if (!branchId) throw new Error("No existe una sucursal activa.");
    const response = await api.request<any>("/inventory/adjust", {
      method: "POST",
      body: JSON.stringify({
        branch_id: branchId,
        product_id: productId,
        movement_type: movementType,
        quantity,
        reason: reason || "Ajuste manual de inventario",
      }),
    });
    await fetchBusinessData();
    return mapApiMovement({ ...response.data, product_name: productName, actor_name: user?.full_name });
  };

  // Sales
  const pendingSaleAttempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const recordSale = async ({
    items,
    paymentMethod,
    payments,
    cashReceived = 0,
    sinpeRef,
    customerName = "CLIENTE CONTADO",
    customerCedula,
    docType = "04",
    isTest = false,
  }: {
    items: Array<{ product: Product; quantity: number; discountPercentage?: number }>;
    paymentMethod: "CASH_CRC" | "SINPE" | "CARD" | "MIXED";
    payments?: Array<{ payment_method: string; amount: number; reference_number?: string }>;
    cashReceived?: number;
    sinpeRef?: string;
    customerName?: string;
    customerCedula?: string;
    docType?: "04" | "01";
    isTest?: boolean;
  }) => {
    const branchId = activeCashSession?.branch_id;
    if (!branchId) throw new Error("No existe una sucursal activa para procesar la venta.");
    if (!activeCashSession?.id) throw new Error("Debes abrir una caja antes de vender.");

    let customerId: string | null = null;
    if (docType === "01") {
      if (!customerCedula || !customerName || customerName === "CLIENTE CONTADO") {
        throw new Error("La factura electrónica requiere nombre e identificación del cliente.");
      }
      let customer = customers.find((row) => row.identification_number === customerCedula);
      if (!customer) {
        const digits = customerCedula.replace(/\D/g, "");
        const identificationType = digits.length === 9 ? "01" : digits.length === 10 ? "02" : digits.length <= 12 ? "03" : "04";
        customer = mapApiCustomer((await api.request<any>("/customers", {
          method: "POST",
          body: JSON.stringify({
            name: customerName,
            identification_type: identificationType,
            identification_number: customerCedula,
          }),
        })).data);
      }
      customerId = customer.id;
    }

    const amountDue = items.reduce((sum, item) => {
      const gross = Number((item.product.sale_price * item.quantity).toFixed(2));
      const pct = Number((item.discountPercentage || 0).toFixed(2));
      return sum + gross - Number((gross * pct / 100).toFixed(2));
    }, 0);
    const paymentTotal = paymentMethod === "CASH_CRC" && cashReceived > 0 ? cashReceived : Number(amountDue.toFixed(2));
    const payload = {
      branch_id: branchId,
      cash_session_id: activeCashSession.id,
      customer_id: customerId,
      currency: "CRC",
      notes: isTest ? "VENTA DE PRUEBA EN AMBIENTE STAGING" : undefined,
      items: items.map((item) => ({
        product_id: item.product.id, quantity: item.quantity,
        discount_percentage: Number((item.discountPercentage || 0).toFixed(2)),
      })),
      payments: payments?.length ? payments : [{
        payment_method: paymentMethod, amount: paymentTotal,
        reference_number: sinpeRef || null,
      }],
    };
    const fingerprint = JSON.stringify(payload);
    const attemptStorageKey = `orbitica.sale-attempt:${orgId}:${user?.id}`;
    if (!pendingSaleAttempt.current) {
      try { pendingSaleAttempt.current = JSON.parse(sessionStorage.getItem(attemptStorageKey) || "null"); } catch { /* Start a new attempt if browser storage is unavailable. */ }
    }
    if (pendingSaleAttempt.current?.fingerprint !== fingerprint) {
      pendingSaleAttempt.current = { fingerprint, key: crypto.randomUUID() };
    }
    try { sessionStorage.setItem(attemptStorageKey, JSON.stringify(pendingSaleAttempt.current)); } catch { /* In-memory retry key remains available. */ }
    const saleResponse = await api.request<any>("/sales", {
      method: "POST", body: fingerprint,
      headers: { "Idempotency-Key": pendingSaleAttempt.current!.key },
    });

    const stored = saleResponse.data;
    // The API commits sale + payments + stock + fiscal event atomically.
    // A receipt/network failure after this point must never suggest reselling.
    let receiptData: any = null;
    let fiscalWarning = `Venta ${stored.sale_number} guardada. Comprobante pendiente de Hacienda.`;
    const invoice = mapApiInvoice({ id: stored.invoice_id, sale_id: stored.id,
      organization_id: stored.organization_id, numeric_key: stored.numeric_key,
      consecutive_number: stored.consecutive_number, status: stored.fiscal_status,
      doc_type: docType, total_amount: stored.total_amount, created_at: stored.created_at,
      receiver_name: customerName, environment: settings.atv_environment });
    const sale = mapApiSale(stored, invoice);
    try {
      receiptData = (await api.request<any>(`/sales/${stored.id}/receipt`)).data;
      sale.receipt_data = receiptData;
    } catch {
      fiscalWarning += " El recibo se puede reimprimir desde el historial. No repita la venta.";
    }
    pendingSaleAttempt.current = null;
    try { sessionStorage.removeItem(attemptStorageKey); } catch { /* Browser storage may be disabled. */ }
    await fetchBusinessData();
    return { sale, invoice, receiptData, fiscalWarning };
  };

  const openCashSession = async (initialAmount: number) => {
    const branchId = branches[0]?.id;
    if (!branchId) throw new Error("No existe una sucursal activa.");
    const registersResponse = await api.request<any[]>(`/cash-registers?branch_id=${branchId}`);
    let register = registersResponse.data[0];
    if (!register) {
      if (!user?.permissions.some(p => ["*", "cash:manage"].includes(p))) throw new Error("El propietario debe crear una terminal para esta sucursal.");
      register = (await api.request<any>("/cash-registers", {
        method: "POST",
        body: JSON.stringify({ branch_id: branchId, name: "Caja POS 01", pos_terminal_number: "00001" }),
      })).data;
    }
    await api.request("/cash-registers/sessions/open", {
      method: "POST",
      body: JSON.stringify({ cash_register_id: register.id, initial_cash_amount: initialAmount }),
    });
    await fetchBusinessData();
  };

  const closeCashSession = async (actualCash?: number) => {
    if (!activeCashSession) throw new Error("No hay una sesión de caja abierta.");
    const expected = activeCashSession.expected_cash_amount ?? activeCashSession.initial_amount + activeCashSession.cash_sales;
    await api.request(`/cash-registers/sessions/${activeCashSession.id}/close`, {
      method: "POST",
      body: JSON.stringify({ actual_cash_amount: actualCash ?? expected }),
    });
    await fetchBusinessData();
  };

  const updateSubscription = (details: Partial<SubscriptionDetails>) => {
    setSubscription((prev) => ({ ...prev, ...details }));
    logAudit("SUBSCRIPTION_UPDATED", `Suscripción actualizada a plan: ${details.plan_id || subscription.plan_id} (${details.state || subscription.state})`);
  };

  const updateOnboarding = (progress: Partial<OnboardingProgress>) => {
    setOnboarding((prev) => ({
      ...prev,
      ...progress,
      steps: { ...prev.steps, ...(progress.steps || {}) },
      last_saved_at: new Date().toISOString(),
    }));

    if (orgId && orgId !== "default_tenant") {
      api
        .request("/organizations/onboarding", {
          method: "PUT",
          body: JSON.stringify({
            current_step: progress.current_step,
            is_completed: progress.is_completed,
            business_data_completed: progress.steps?.business,
            fiscal_data_completed: progress.steps?.fiscal,
            branches_completed: progress.steps?.branches,
            payments_completed: progress.steps?.payments,
            products_completed: progress.steps?.products,
            contacts_completed: progress.steps?.contacts,
            users_completed: progress.steps?.users,
          }),
        })
        .catch(() => {});
    }
    logAudit("ONBOARDING_SAVED", `Progreso de onboarding guardado: Paso ${progress.current_step || onboarding.current_step}`);
  };

  const executeImportBatch = async (
    batchMeta: Omit<ImportBatch, "id" | "created_at" | "is_reverted" | "records_created_ids">,
    items: any[]
  ): Promise<ImportBatch> => {
    const createdIds: string[] = [];

    if (batchMeta.entity_type === "products") {
      for (const item of items) {
        const prod = await addProduct({
          name: item.name || "Producto Importado",
          sku: item.sku || `SKU-${Date.now().toString().slice(-4)}`,
          barcode: item.barcode || "",
          sale_price: Number(item.sale_price) || 0,
          cost_price: Number(item.cost_price) || 0,
          min_stock_alert: Number(item.min_stock_alert) || 5,
          tax_rate: item.tax_rate !== undefined ? Number(item.tax_rate) : 13,
          cabys_code: item.cabys_code,
          unit_of_measure: item.unit_of_measure || "Unid",
          category_name: item.category_name || "General",
          stock: Number(item.stock) || 0,
        });
        createdIds.push(prod.id);
      }
    } else if (batchMeta.entity_type === "customers") {
      for (const item of items) {
        const cust = await addCustomer({
          name: item.name || "Cliente Importado",
          identification_type: item.identification_type || "FISICA",
          identification_number: item.identification_number || "000000000",
          email: item.email || "",
          phone: item.phone || "",
          address: item.address || "",
          is_active: true,
        });
        createdIds.push(cust.id);
      }
    } else if (batchMeta.entity_type === "suppliers") {
      for (const item of items) {
        const supp = await addSupplier({
          name: item.name || "Proveedor Importado",
          legal_id: item.legal_id || "000000000",
          legal_id_type: item.legal_id_type || "JURIDICA",
          contact_person: item.contact_person || "",
          phone: item.phone || "",
          email: item.email || "",
          address: item.address || "",
        });
        createdIds.push(supp.id);
      }
    }

    const batch: ImportBatch = {
      id: `imp_${Date.now()}`,
      organization_id: orgId,
      entity_type: batchMeta.entity_type,
      filename: batchMeta.filename,
      total_rows: batchMeta.total_rows,
      imported_rows: items.length,
      failed_rows: batchMeta.failed_rows || 0,
      errors: batchMeta.errors || [],
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      is_reverted: false,
      records_created_ids: createdIds,
    };

    setImportBatches((prev) => {
      const next = [batch, ...prev];
      if (typeof window !== "undefined" && orgId) {
        try {
          localStorage.setItem(`orbitica_import_batches_${orgId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    logAudit("IMPORT_BATCH_EXECUTED", `Importación de ${items.length} registros de ${batchMeta.entity_type} desde ${batchMeta.filename}`);
    return batch;
  };

  const revertImportBatch = async (batchId: string): Promise<boolean> => {
    const batch = importBatches.find((b) => b.id === batchId && !b.is_reverted);
    if (!batch) return false;

    if (batch.entity_type === "products") {
      await Promise.all(batch.records_created_ids.map((id) => deleteProduct(id)));
    } else if (batch.entity_type === "customers") {
      await Promise.all(batch.records_created_ids.map((id) => deleteCustomer(id)));
    } else if (batch.entity_type === "suppliers") {
      await Promise.all(batch.records_created_ids.map((id) => deleteSupplier(id)));
    }

    setImportBatches((prev) => {
      const next = prev.map((b) => (b.id === batchId ? { ...b, is_reverted: true } : b));
      if (typeof window !== "undefined" && orgId) {
        try {
          localStorage.setItem(`orbitica_import_batches_${orgId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    logAudit("IMPORT_BATCH_REVERTED", `Lote ${batch.filename} revertido (${batch.records_created_ids.length} registros removidos)`);
    return true;
  };

  const createSupportTicket = async (
    ticketData: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at" | "messages">,
    _initialMessage: string,
  ): Promise<SupportTicket> => {
    const created = await api.request<any>("/support/tickets", {
      method: "POST",
      body: JSON.stringify({
        subject: ticketData.subject,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority,
        telemetry: ticketData.telemetry || null,
      }),
    });
    const detail = await api.request<any>(`/support/tickets/${created.data.id}`);
    const mapped = mapApiSupportTicket(detail.data, {
      organizationId: orgId,
      organizationName: ticketData.organization_name,
      userName: ticketData.created_by_name,
      userEmail: ticketData.created_by_email,
    });
    setSupportTickets((previous) => [mapped, ...previous.filter((ticket) => ticket.id !== mapped.id)]);
    return mapped;
  };

  const addSupportMessage = async (ticketId: string, message: string, isInternal: boolean = false) => {
    await api.request(`/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, is_internal_note: isInternal }),
    });
    const detail = await api.request<any>(`/support/tickets/${ticketId}`);
    const mapped = mapApiSupportTicket(detail.data, {
      organizationId: orgId,
      organizationName: settings.trade_name,
      userName: user?.full_name || "Usuario",
      userEmail: user?.email || "",
    });
    setSupportTickets((previous) => previous.map((ticket) => ticket.id === ticketId ? mapped : ticket));
  };

  const grantSupportAccess = async (
    reason: string,
    durationMinutes: number,
    permission: "READ_ONLY" | "FULL_ADMIN",
  ): Promise<SupportAccessGrant> => {
    const response = await api.request<any>("/support/delegated-access", {
      method: "POST",
      body: JSON.stringify({
        reason,
        duration_minutes: durationMinutes,
        permission_level: permission,
      }),
    });
    const grant: SupportAccessGrant = {
      id: String(response.data.grant_id),
      organization_id: orgId,
      organization_name: settings.trade_name,
      granted_by_user_id: user?.id || "",
      reason,
      permission_level: response.data.permission_level,
      expires_at: response.data.expires_at,
      created_at: new Date().toISOString(),
      is_revoked: false,
      token: response.data.delegated_token,
    };

    setActiveSupportGrant(grant);
    return grant;
  };

  const revokeSupportAccess = async (grantId?: string) => {
    const targetId = grantId || activeSupportGrant?.id;
    if (!targetId) return;
    await api.request(`/support/delegated-access/${targetId}`, { method: "DELETE" });
    setActiveSupportGrant(null);
  };

  const resolveHealthAlert = (alertId: string) => {
    setHealthAlerts((prev) => {
      const next = prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a));
      if (typeof window !== "undefined" && orgId) {
        try {
          localStorage.setItem(`orbitica_health_alerts_${orgId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const checkLimit = (resource: "products" | "users" | "branches" | "cajas") => {
    if (subscription.state === "suspended" || subscription.state === "expired") {
      return {
        allowed: false,
        max: 0,
        current: 0,
        message: `Tu suscripción se encuentra ${subscription.state === "suspended" ? "suspendida" : "vencida"}. Reactiva tu plan para continuar creando elementos.`,
      };
    }

    const plan = subscription.plan_id || "crece";
    if (resource === "users") {
      const max = plan === "inicio" ? 2 : plan === "crece" ? 8 : 100;
      const current = employees.length + 1;
      return {
        allowed: current < max,
        max,
        current,
        message: current >= max ? `Has alcanzado el límite de ${max} usuarios del plan ${plan.toUpperCase()}.` : undefined,
      };
    }

    if (resource === "branches") {
      const max = plan === "inicio" ? 1 : plan === "crece" ? 3 : 10;
      const current = branches.length;
      return {
        allowed: current < max,
        max,
        current,
        message: current >= max ? `Has alcanzado el límite de ${max} sucursales del plan ${plan.toUpperCase()}.` : undefined,
      };
    }

    if (resource === "cajas") {
      const max = plan === "inicio" ? 1 : plan === "crece" ? 5 : 50;
      const current = 1;
      return {
        allowed: current < max,
        max,
        current,
        message: current >= max ? `Has alcanzado el límite de cajas POS.` : undefined,
      };
    }

    return { allowed: true, max: 999999, current: products.length };
  };

  const purgeTestSales = () => {
    const testCount = sales.filter((s) => s.is_test).length;
    setSales((prev) => prev.filter((s) => !s.is_test));
    setInvoices((prev) => prev.filter((i) => !i.is_test));
    logAudit("TEST_SALES_PURGED", `Se purgaron ${testCount} ventas de prueba del sistema`);
    return testCount;
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        products,
        customers,
        suppliers,
        purchases,
        movements,
        sales,
        invoices,
        auditLogs,
        activeCashSession,
        employees,
        branches,
        quotes,
        expenses,
        workOrders,
        dispatchOrders,
        coupons,
        loyaltyMembers,
        bankAccounts,
        bankTransactions,
        suspendedSales,
        foundersPromo,
        updateFoundersPromo,
        updateSettings,
        fetchStatus,
        isInitialLoading: !isLoaded,
        errorMessage,
        retryFetch: fetchBusinessData,
        isOffline,
        fiscalContingencyNotice,
        subscription,
        updateSubscription,
        onboarding,
        updateOnboarding,
        importBatches,
        executeImportBatch,
        revertImportBatch,
        supportTickets,
        createSupportTicket,
        addSupportMessage,
        activeSupportGrant,
        grantSupportAccess,
        revokeSupportAccess,
        healthAlerts,
        resolveHealthAlert,
        checkLimit,
        purgeTestSales,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addBranch,
        updateBranch,
        deleteBranch,
        addQuote,
        updateQuote,
        deleteQuote,
        addExpense,
        updateExpense,
        deleteExpense,
        addWorkOrder,
        updateWorkOrder,
        deleteWorkOrder,
        addDispatchOrder,
        updateDispatchOrder,
        deleteDispatchOrder,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        addLoyaltyPoints,
        redeemLoyaltyPoints,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        addBankTransaction,
        suspendSale,
        resumeSale,
        deleteSuspendedSale,
        recordPurchase,
        recordAdjustment,
        recordSale,
        openCashSession,
        closeCashSession,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
