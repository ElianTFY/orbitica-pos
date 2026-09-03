"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  SupportMessage,
  SupportAccessGrant,
  TenantHealthAlert,
} from "@/types";

export interface BusinessSettings {
  trade_name: string;
  legal_name: string;
  identification_number: string;
  identification_type: "FISICA" | "JURIDICA" | "DIMEX";
  email: string;
  phone: string;
  address: string;
  branch_name: string;
  tax_regime: "TRADICIONAL" | "SIMPLIFICADO";
  default_currency: "CRC" | "USD";
  atv_environment: "STAGING" | "PRODUCTION";
  atv_username: string;
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
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  // Real State Machine Statuses
  fetchStatus: "idle" | "loading" | "error" | "empty" | "unauthorized" | "offline";
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
  executeImportBatch: (batchMeta: Omit<ImportBatch, "id" | "created_at" | "is_reverted" | "records_created_ids">, items: any[]) => ImportBatch;
  revertImportBatch: (batchId: string) => boolean;
  supportTickets: SupportTicket[];
  createSupportTicket: (ticket: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at" | "messages">, initialMessage: string) => SupportTicket;
  addSupportMessage: (ticketId: string, message: string, isInternal?: boolean) => void;
  activeSupportGrant: SupportAccessGrant | null;
  grantSupportAccess: (reason: string, durationMinutes: number, permission: "READ_ONLY" | "FULL_ADMIN") => SupportAccessGrant;
  revokeSupportAccess: (grantId?: string) => void;
  healthAlerts: TenantHealthAlert[];
  resolveHealthAlert: (alertId: string) => void;
  checkLimit: (resource: "products" | "users" | "branches" | "cajas") => { allowed: boolean; max: number; current: number; message?: string };
  purgeTestSales: () => number;
  // Products
  addProduct: (product: Omit<Product, "id" | "organization_id">) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Customers
  addCustomer: (customer: Omit<Customer, "id" | "organization_id">) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  // Suppliers
  addSupplier: (supplier: Omit<Supplier, "id" | "organization_id">) => Supplier;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  // Employees
  addEmployee: (employee: Omit<Employee, "id" | "organization_id" | "created_at">) => Employee;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  // Branches
  addBranch: (branch: Omit<Branch, "id" | "organization_id" | "created_at">) => Branch;
  updateBranch: (id: string, branch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  // Quotes
  addQuote: (quote: Omit<Quote, "id" | "organization_id" | "quote_number" | "created_at">) => Quote;
  updateQuote: (id: string, quote: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
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
  }) => PurchaseRecord;
  recordAdjustment: (data: {
    productId: string;
    productName: string;
    movementType: "IN_PURCHASE" | "OUT_SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "WASTE";
    quantity: number;
    reason?: string;
  }) => InventoryMovement;
  // Sales & Cash
  recordSale: (saleData: {
    items: Array<{ product: Product; quantity: number }>;
    paymentMethod: "CASH_CRC" | "SINPE" | "CARD" | "MIXED";
    payments?: Array<{ payment_method: string; amount: number; reference_number?: string }>;
    cashReceived?: number;
    sinpeRef?: string;
    customerName?: string;
    customerCedula?: string;
    docType?: "04" | "01";
    isTest?: boolean;
  }) => { sale: SaleRecord; invoice: InvoiceRecord; receiptData: any };
  openCashSession: (initialAmount: number) => void;
  closeCashSession: (actualCash?: number) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const orgId = user?.organization_id || user?.email || "default_tenant";

  const [settings, setSettings] = useState<BusinessSettings>({
    trade_name: user?.organization_name || "",
    legal_name: user?.legal_name || user?.organization_name || "",
    identification_number: user?.identification_number || "",
    identification_type: "JURIDICA",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
    branch_name: user?.branch_name || "Sucursal Principal",
    tax_regime: "TRADICIONAL",
    default_currency: "CRC",
    atv_environment: "STAGING",
    atv_username: "",
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

  // Authoritative Backend API Sync
  const fetchBusinessData = useCallback(async () => {
    if (!orgId) return;
    setFetchStatus("loading");
    setErrorMessage(null);

    try {
      const [
        orgRes,
        onbRes,
        subRes,
        branchesRes,
        productsRes,
        customersRes,
        invoicesRes,
        salesRes,
        purchasesRes,
        cashRes,
        supportRes,
        suppliersRes,
        quotesRes,
      ] = await Promise.allSettled([
        api.request<any>("/organizations/me"),
        api.request<any>("/organizations/onboarding"),
        api.request<any>("/subscription/current"),
        api.request<any[]>("/branches"),
        api.request<any[]>("/products"),
        api.request<any[]>("/customers"),
        api.request<any[]>("/invoices"),
        api.request<any[]>("/sales"),
        api.request<any[]>("/purchases"),
        api.request<any>("/cash-registers/sessions/active"),
        api.request<any[]>("/support/tickets"),
        api.request<any[]>("/suppliers"),
        api.request<any[]>("/quotes"),
      ]);

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
        setProducts(productsRes.value.data);
        if (productsRes.value.data.length > 0) hasData = true;
      }
      if (customersRes.status === "fulfilled" && customersRes.value?.data) {
        setCustomers(customersRes.value.data);
      }
      if (invoicesRes.status === "fulfilled" && invoicesRes.value?.data) {
        setInvoices(invoicesRes.value.data);
      }
      if (salesRes.status === "fulfilled" && salesRes.value?.data) {
        setSales(salesRes.value.data);
        if (salesRes.value.data.length > 0) hasData = true;
      }
      if (purchasesRes.status === "fulfilled" && purchasesRes.value?.data) {
        setPurchases(purchasesRes.value.data);
      }
      if (cashRes.status === "fulfilled" && cashRes.value?.data) {
        setActiveCashSession(cashRes.value.data);
      }
      if (supportRes.status === "fulfilled" && supportRes.value?.data) {
        setSupportTickets(supportRes.value.data);
      }
      if (suppliersRes.status === "fulfilled" && suppliersRes.value?.data) {
        setSuppliers(suppliersRes.value.data);
      }
      if (quotesRes.status === "fulfilled" && quotesRes.value?.data) {
        setQuotes(quotesRes.value.data);
      }

      setIsOffline(false);
      setFiscalContingencyNotice(null);
      setFetchStatus(hasData ? "idle" : "empty");
    } catch (err: any) {
      if (err?.status === 401) {
        setFetchStatus("unauthorized");
        setErrorMessage("Sesión no autorizada o expirada.");
      } else {
        setFetchStatus("offline");
        setIsOffline(true);
        setFiscalContingencyNotice(
          "Sin conexión con el servidor central de Orbítica. Por disposición tributaria de la DGT, la emisión fiscal automática requiere validación en línea. En caso de contingencia prolongada, debe utilizar comprobantes físicos preimpresos autorizados."
        );
        setErrorMessage("Sin conexión con el backend central.");
      }
    } finally {
      setIsLoaded(true);
    }
  }, [orgId]);

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
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      actor_name: user?.full_name || "Usuario",
      action,
      resource,
      ip_address: "127.0.0.1",
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (orgId && orgId !== "default_tenant") {
      api
        .request("/organizations/me", {
          method: "PUT",
          body: JSON.stringify({
            trade_name: newSettings.trade_name,
            legal_name: newSettings.legal_name,
            identification_number: newSettings.identification_number,
            identification_type: newSettings.identification_type,
            email: newSettings.email,
            phone: newSettings.phone,
            address_detail: newSettings.address,
            default_currency: newSettings.default_currency,
          }),
        })
        .catch(() => {});
    }
    logAudit("SETTINGS_UPDATED", "Configuración Comercial");
  };

  // Products
  const addProduct = (prod: Omit<Product, "id" | "organization_id">): Product => {
    const newProduct: Product = {
      ...prod,
      id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
    };
    setProducts((prev) => [newProduct, ...prev]);
    logAudit("PRODUCT_CREATED", `Producto: ${newProduct.name}`);
    return newProduct;
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
    logAudit("PRODUCT_UPDATED", `Producto ID: ${id}`);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    logAudit("PRODUCT_DELETED", `Producto ID: ${id}`);
  };

  // Customers
  const addCustomer = (cust: Omit<Customer, "id" | "organization_id">): Customer => {
    const newCustomer: Customer = {
      ...cust,
      id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 10),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    logAudit("CUSTOMER_CREATED", `Cliente: ${newCustomer.name}`);
    return newCustomer;
  };

  const updateCustomer = (id: string, updated: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    logAudit("CUSTOMER_DELETED", `Cliente ID: ${id}`);
  };

  // Suppliers
  const addSupplier = (supp: Omit<Supplier, "id" | "organization_id">): Supplier => {
    const newSupplier: Supplier = {
      ...supp,
      id: `supp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 10),
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    logAudit("SUPPLIER_CREATED", `Proveedor: ${newSupplier.name}`);
    return newSupplier;
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    logAudit("SUPPLIER_DELETED", `Proveedor ID: ${id}`);
  };

  // Employees
  const addEmployee = (emp: Omit<Employee, "id" | "organization_id" | "created_at">): Employee => {
    const newEmp: Employee = {
      ...emp,
      id: `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 10),
    };
    setEmployees((prev) => [newEmp, ...prev]);
    logAudit("EMPLOYEE_CREATED", `Empleado: ${newEmp.full_name} (${newEmp.role})`);
    return newEmp;
  };

  const updateEmployee = (id: string, updated: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updated } : e))
    );
    logAudit("EMPLOYEE_UPDATED", `Empleado ID: ${id}`);
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    logAudit("EMPLOYEE_DELETED", `Empleado ID: ${id}`);
  };

  // Branches
  const addBranch = (br: Omit<Branch, "id" | "organization_id" | "created_at">): Branch => {
    const newBranch: Branch = {
      ...br,
      id: `br_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 10),
    };
    setBranches((prev) => [...prev, newBranch]);
    logAudit("BRANCH_CREATED", `Sucursal: ${newBranch.name} (${newBranch.code})`);
    return newBranch;
  };

  const updateBranch = (id: string, updated: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
    );
    logAudit("BRANCH_UPDATED", `Sucursal ID: ${id}`);
  };

  const deleteBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    logAudit("BRANCH_DELETED", `Sucursal ID: ${id}`);
  };

  // Quotes
  const addQuote = (q: Omit<Quote, "id" | "organization_id" | "quote_number" | "created_at">): Quote => {
    const num = `COT-${String(Date.now()).slice(-6)}`;
    const newQuote: Quote = {
      ...q,
      id: `quote_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
      quote_number: num,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    setQuotes((prev) => [newQuote, ...prev]);
    logAudit("QUOTE_CREATED", `Cotización: ${newQuote.quote_number} - ${newQuote.customer_name}`);
    return newQuote;
  };

  const updateQuote = (id: string, updated: Partial<Quote>) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
    );
    logAudit("QUOTE_UPDATED", `Cotización ID: ${id}`);
  };

  const deleteQuote = (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    logAudit("QUOTE_DELETED", `Cotización ID: ${id}`);
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
  const recordPurchase = ({
    supplierName,
    invoiceNumber,
    paymentType,
    items,
  }: {
    supplierName: string;
    invoiceNumber: string;
    paymentType: "CONTADO" | "CREDITO";
    items: Array<{ productId?: string; productName: string; quantity: number; unitCost: number }>;
  }): PurchaseRecord => {
    const totalAmount = items.reduce((acc, it) => acc + it.quantity * it.unitCost * 1.13, 0);

    const purchase: PurchaseRecord = {
      id: `purch_${Date.now()}`,
      organization_id: orgId,
      supplier_name: supplierName,
      invoice_number: invoiceNumber,
      payment_type: paymentType,
      total_amount: totalAmount,
      items_count: items.reduce((acc, it) => acc + it.quantity, 0),
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "RECEIVED",
    };

    setPurchases((prev) => [purchase, ...prev]);

    // Update stock and create inventory movements
    items.forEach((it) => {
      let prevStock = 0;
      if (it.productId) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === it.productId) {
              prevStock = p.stock ?? 0;
              const newStock = prevStock + it.quantity;
              return { ...p, stock: newStock, cost_price: it.unitCost };
            }
            return p;
          })
        );
      }

      const mov: InventoryMovement = {
        id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        organization_id: orgId,
        created_at: purchase.created_at,
        product_name: it.productName,
        movement_type: "IN_PURCHASE",
        quantity: it.quantity,
        previous_quantity: prevStock,
        new_quantity: prevStock + it.quantity,
        actor_name: user?.full_name || "Propietario",
        reason: `Compra factura #${invoiceNumber} (${supplierName})`,
      };
      setMovements((prev) => [mov, ...prev]);
    });

    logAudit("PURCHASE_RECORDED", `Compra Factura: ${invoiceNumber}`);
    return purchase;
  };

  const recordAdjustment = ({
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
  }): InventoryMovement => {
    let currentStock = 0;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          currentStock = p.stock ?? 0;
          const updatedStock = Math.max(0, currentStock + quantity);
          return { ...p, stock: updatedStock };
        }
        return p;
      })
    );

    const mov: InventoryMovement = {
      id: `mov_${Date.now()}`,
      organization_id: orgId,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
      product_name: productName,
      movement_type: movementType,
      quantity,
      previous_quantity: currentStock,
      new_quantity: Math.max(0, currentStock + quantity),
      actor_name: user?.full_name || "Administrador",
      reason: reason || "Ajuste manual de stock",
    };

    setMovements((prev) => [mov, ...prev]);
    logAudit("INVENTORY_ADJUSTED", `Ajuste en ${productName} (${quantity > 0 ? "+" : ""}${quantity})`);
    return mov;
  };

  // Sales
  const recordSale = ({
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
    items: Array<{ product: Product; quantity: number }>;
    paymentMethod: "CASH_CRC" | "SINPE" | "CARD" | "MIXED";
    payments?: Array<{ payment_method: string; amount: number; reference_number?: string }>;
    cashReceived?: number;
    sinpeRef?: string;
    customerName?: string;
    customerCedula?: string;
    docType?: "04" | "01";
    isTest?: boolean;
  }) => {
    const seq = sales.length + 1;
    const saleNum = isTest ? `TEST-${seq.toString().padStart(4, "0")}` : `V-${seq.toString().padStart(6, "0")}`;
    const consecutive = `00100001${docType}${seq.toString().padStart(10, "0")}`;

    // Standard 50-digit Hacienda numeric key:
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = String(now.getFullYear()).slice(-2);
    const rawCedula = (settings.identification_number || "0").replace(/\D/g, "");
    const cedula12 = rawCedula.padStart(12, "0").slice(-12);
    const securityCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    const key = `506${d}${m}${y}${cedula12}${consecutive}1${securityCode}`;

    const subtotal = items.reduce((acc, it) => acc + it.product.sale_price * it.quantity, 0);
    const tax = items.reduce(
      (acc, it) => acc + it.product.sale_price * it.quantity * (it.product.tax_rate / 100),
      0
    );
    const total = subtotal + tax;

    const finalPayments = payments && payments.length > 0 ? payments : [
      {
        payment_method: paymentMethod,
        amount: paymentMethod === "CASH_CRC" && cashReceived > 0 ? cashReceived : total,
        reference_number: sinpeRef || undefined,
      }
    ];

    // Find matched customer
    const matchedCustomer = customers.find(
      (c) =>
        (customerCedula && c.identification_number === customerCedula) ||
        (customerName && c.name.toLowerCase() === customerName.toLowerCase())
    );

    // Call backend asynchronously to persist in PostgreSQL and deduct real inventory
    if (branches.length > 0) {
      api.request("/sales", {
        method: "POST",
        headers: {
          "Idempotency-Key": `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        body: {
          branch_id: activeCashSession?.branch_id || branches[0].id,
          cash_session_id: activeCashSession?.id || undefined,
          customer_id: matchedCustomer?.id || undefined,
          items: items.map((it) => ({
            product_id: it.product.id,
            quantity: it.quantity,
            discount_percentage: 0,
          })),
          payments: finalPayments,
          currency: settings.default_currency || "CRC",
        },
      }).then(() => {
        fetchBusinessData();
      }).catch((e) => {
        console.warn("Backend sales sync:", e);
      });
    }

    // Deduct stock & create movement (only for non-test or track as test)
    setProducts((prev) =>
      prev.map((p) => {
        const itemSold = items.find((it) => it.product.id === p.id);
        if (itemSold) {
          const newStock = Math.max(0, (p.stock ?? 0) - itemSold.quantity);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );

    items.forEach((it) => {
      const mov: InventoryMovement = {
        id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        organization_id: orgId,
        created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
        product_name: it.product.name,
        movement_type: "OUT_SALE",
        quantity: -it.quantity,
        previous_quantity: it.product.stock ?? 0,
        new_quantity: Math.max(0, (it.product.stock ?? 0) - it.quantity),
        actor_name: user?.full_name || "Cajero",
        reason: `${isTest ? "[PRUEBA] " : ""}Venta en POS #${saleNum}`,
      };
      setMovements((prev) => [mov, ...prev]);
    });

    const receiptData = {
      sale_number: saleNum,
      is_test: isTest,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      store: {
        name: settings.trade_name,
        legal_name: settings.legal_name,
        legal_id: settings.identification_number,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        branch_name: settings.branch_name,
      },
      customer: {
        name: customerName,
        identification: customerCedula || null,
      },
      hacienda: {
        doc_type: docType === "01" ? "Factura Electrónica (01)" : "Tiquete Electrónico (04)",
        consecutive,
        numeric_key: key,
        resolution: "Autorizada mediante resolución Nº DGT-R-033-2019 (Esquema v4.4)",
        qr_url: `https://www.hacienda.go.cr/ATV/ComprobanteElectronico/qr?clave=${key}`,
      },
      items: items.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        unit_price: it.product.sale_price,
        tax_amount: it.product.sale_price * (it.product.tax_rate / 100) * it.quantity,
        total: it.product.sale_price * (1 + it.product.tax_rate / 100) * it.quantity,
      })),
      totals: {
        subtotal,
        discount: 0,
        tax,
        total,
        currency: settings.default_currency,
      },
      payments: [
        {
          method: paymentMethod,
          amount: paymentMethod === "CASH_CRC" && cashReceived > 0 ? cashReceived : total,
          reference: sinpeRef || null,
        },
      ],
      footer_message: isTest
        ? "⚠️ COMPROBANTE DE PRUEBA — NO VÁLIDO PARA EFECTOS TRIBUTARIOS"
        : `¡Gracias por su compra en ${settings.trade_name}!`,
    };

    const newSale: SaleRecord = {
      id: `sale_${Date.now()}`,
      organization_id: orgId,
      sale_number: saleNum,
      consecutive_number: consecutive,
      numeric_key: key,
      total,
      subtotal,
      tax,
      payment_method: paymentMethod,
      customer_name: customerName,
      customer_cedula: customerCedula || null,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      items_count: items.reduce((acc, it) => acc + it.quantity, 0),
      status: "COMPLETED",
      is_test: isTest,
      items_snapshot: items.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        unit_price: it.product.sale_price,
        tax_rate: it.product.tax_rate,
        tax_amount: it.product.sale_price * (it.product.tax_rate / 100) * it.quantity,
        total: it.product.sale_price * (1 + it.product.tax_rate / 100) * it.quantity,
      })),
      receipt_data: receiptData,
    };

    const newInvoice: InvoiceRecord = {
      id: `inv_${Date.now()}`,
      organization_id: orgId,
      doc_type: docType,
      doc_type_label: docType === "01" ? "Factura Electrónica (01)" : "Tiquete Electrónico (04)",
      consecutive_number: consecutive,
      numeric_key: key,
      created_at: newSale.created_at,
      customer_name: customerName,
      total,
      status: "ACCEPTED",
      is_test: isTest,
      hacienda_message: isTest
        ? "Venta de prueba simulada exitosamente (Ambiente Sandbox)"
        : "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.4",
      xml_signed: `<?xml version="1.0" encoding="utf-8"?>\n<${docType === "01" ? "FacturaElectronica" : "TiqueteElectronico"} xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/${docType === "01" ? "facturaElectronica" : "tiqueteElectronico"}">\n  <Clave>${key}</Clave>\n  <NumeroConsecutivo>${consecutive}</NumeroConsecutivo>\n  <FechaEmision>${new Date().toISOString()}</FechaEmision>\n  <Emisor>\n    <Nombre>${settings.legal_name}</Nombre>\n    <Identificacion><Tipo>02</Tipo><Numero>${settings.identification_number}</Numero></Identificacion>\n  </Emisor>\n  <ResumenFactura>\n    <CodigoTipoMoneda><CodigoMoneda>${settings.default_currency}</CodigoMoneda><TipoCambio>1.00</TipoCambio></CodigoTipoMoneda>\n    <TotalComprobante>${total.toFixed(2)}</TotalComprobante>\n  </ResumenFactura>\n</${docType === "01" ? "FacturaElectronica" : "TiqueteElectronico"}>`,
    };

    setSales((prev) => [newSale, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);

    if (activeCashSession && !isTest) {
      const updatedCash: CashSession = {
        ...activeCashSession,
        total_sales: activeCashSession.total_sales + total,
        cash_sales: paymentMethod === "CASH_CRC" ? activeCashSession.cash_sales + total : activeCashSession.cash_sales,
        sinpe_sales: paymentMethod === "SINPE" ? activeCashSession.sinpe_sales + total : activeCashSession.sinpe_sales,
        card_sales: paymentMethod === "CARD" ? activeCashSession.card_sales + total : activeCashSession.card_sales,
      };
      setActiveCashSession(updatedCash);
    }

    logAudit("SALE_COMPLETED", `${isTest ? "[PRUEBA] " : ""}Venta #${saleNum} (${paymentMethod})`);

    return { sale: newSale, invoice: newInvoice, receiptData: newSale.receipt_data };
  };

  const openCashSession = (initialAmount: number) => {
    const session: CashSession = {
      id: `cash_${Date.now()}`,
      organization_id: orgId,
      opened_at: new Date().toISOString(),
      initial_amount: initialAmount,
      cash_sales: 0,
      sinpe_sales: 0,
      card_sales: 0,
      total_sales: 0,
      status: "OPEN",
    };
    setActiveCashSession(session);
    logAudit("CASH_SESSION_OPENED", `Apertura de Caja: ₡${initialAmount}`);
  };

  const closeCashSession = (actualCash?: number) => {
    if (activeCashSession) {
      const expectedCash = activeCashSession.initial_amount + activeCashSession.cash_sales;
      const difference = actualCash !== undefined ? actualCash - expectedCash : 0;
      const closed: CashSession = {
        ...activeCashSession,
        closed_at: new Date().toISOString(),
        status: "CLOSED",
        actual_cash: actualCash,
        cash_difference: difference,
      };
      // Archive the session in history (never lose data)
      try {
        const historyKey = `orbitica_cash_history_${orgId}`;
        const existing = JSON.parse(localStorage.getItem(historyKey) || "[]");
        localStorage.setItem(historyKey, JSON.stringify([closed, ...existing]));
      } catch {}
      // Clear active session → next openCashSession will start fresh
      setActiveCashSession(null);
      const diff = difference !== 0 ? ` | Diferencia: ₡${difference.toFixed(2)}` : " | Cuadre exacto";
      logAudit("CASH_SESSION_CLOSED", `Cierre de Caja: Ventas ₡${closed.total_sales.toFixed(2)}${diff}`);
    }
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

  const executeImportBatch = (
    batchMeta: Omit<ImportBatch, "id" | "created_at" | "is_reverted" | "records_created_ids">,
    items: any[]
  ): ImportBatch => {
    const createdIds: string[] = [];

    if (batchMeta.entity_type === "products") {
      items.forEach((item) => {
        const prod = addProduct({
          name: item.name || "Producto Importado",
          sku: item.sku || `SKU-${Date.now().toString().slice(-4)}`,
          barcode: item.barcode || "",
          sale_price: Number(item.sale_price) || 0,
          cost_price: Number(item.cost_price) || 0,
          min_stock_alert: Number(item.min_stock_alert) || 5,
          tax_rate: item.tax_rate !== undefined ? Number(item.tax_rate) : 13,
          category_name: item.category_name || "General",
          stock: Number(item.stock) || 0,
        });
        createdIds.push(prod.id);
      });
    } else if (batchMeta.entity_type === "customers") {
      items.forEach((item) => {
        const cust = addCustomer({
          name: item.name || "Cliente Importado",
          identification_type: item.identification_type || "FISICA",
          identification_number: item.identification_number || "000000000",
          email: item.email || "",
          phone: item.phone || "",
          address: item.address || "",
          is_active: true,
        });
        createdIds.push(cust.id);
      });
    } else if (batchMeta.entity_type === "suppliers") {
      items.forEach((item) => {
        const supp = addSupplier({
          name: item.name || "Proveedor Importado",
          legal_id: item.legal_id || "000000000",
          legal_id_type: item.legal_id_type || "JURIDICA",
          contact_person: item.contact_person || "",
          phone: item.phone || "",
          email: item.email || "",
          address: item.address || "",
        });
        createdIds.push(supp.id);
      });
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

  const revertImportBatch = (batchId: string): boolean => {
    const batch = importBatches.find((b) => b.id === batchId && !b.is_reverted);
    if (!batch) return false;

    if (batch.entity_type === "products") {
      setProducts((prev) => prev.filter((p) => !batch.records_created_ids.includes(p.id)));
    } else if (batch.entity_type === "customers") {
      setCustomers((prev) => prev.filter((c) => !batch.records_created_ids.includes(c.id)));
    } else if (batch.entity_type === "suppliers") {
      setSuppliers((prev) => prev.filter((s) => !batch.records_created_ids.includes(s.id)));
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

  const createSupportTicket = (
    ticketData: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at" | "messages">,
    initialMessage: string
  ): SupportTicket => {
    const newTicket: SupportTicket = {
      ...ticketData,
      id: `tick_${Date.now()}`,
      ticket_number: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender_type: "CLIENT",
          sender_name: ticketData.created_by_name || user?.full_name || "Usuario",
          message: initialMessage,
          created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
        },
      ],
    };

    setSupportTickets((prev) => {
      const next = [newTicket, ...prev];
      if (typeof window !== "undefined" && orgId) {
        try {
          localStorage.setItem(`orbitica_support_tickets_${orgId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    logAudit("SUPPORT_TICKET_CREATED", `Ticket creado #${newTicket.ticket_number}: ${newTicket.subject}`);
    return newTicket;
  };

  const addSupportMessage = (ticketId: string, message: string, isInternal: boolean = false) => {
    setSupportTickets((prev) => {
      const next = prev.map((t) => {
        if (t.id === ticketId) {
          const newMsg: SupportMessage = {
            id: `msg_${Date.now()}`,
            sender_type: isInternal ? "SUPPORT_AGENT" : "CLIENT",
            sender_name: isInternal ? "Especialista de Soporte Orbítica" : (user?.full_name || "Cliente"),
            message,
            is_internal_note: isInternal,
            created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
          };
          return {
            ...t,
            status: (isInternal ? "WAITING_CLIENT" : "IN_PROGRESS") as SupportTicket["status"],
            updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
            messages: [...t.messages, newMsg],
          };
        }
        return t;
      });
      if (typeof window !== "undefined" && orgId) {
        try {
          localStorage.setItem(`orbitica_support_tickets_${orgId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const grantSupportAccess = (
    reason: string,
    durationMinutes: number,
    permission: "READ_ONLY" | "FULL_ADMIN"
  ): SupportAccessGrant => {
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + durationMinutes);

    const grant: SupportAccessGrant = {
      id: `grant_${Date.now()}`,
      organization_id: orgId,
      organization_name: settings.trade_name,
      granted_by_user_id: user?.id || "owner",
      reason: reason || "Asistencia técnica autorizada",
      permission_level: permission,
      expires_at: expires.toISOString(),
      created_at: new Date().toISOString(),
      is_revoked: false,
      token: `sup_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    setActiveSupportGrant(grant);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`orbitica_support_grant_${orgId}`, JSON.stringify(grant));
      } catch {}
    }
    logAudit("SUPPORT_ACCESS_GRANTED", `Acceso de soporte concedido por ${durationMinutes} min (${permission})`);
    return grant;
  };

  const revokeSupportAccess = () => {
    setActiveSupportGrant((prev) => (prev ? { ...prev, is_revoked: true } : null));
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`orbitica_support_grant_${orgId}`);
      } catch {}
    }
    logAudit("SUPPORT_ACCESS_REVOKED", "Acceso delegado de soporte revocado inmediatamente");
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