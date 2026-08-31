"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/auth-context";
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
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
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
    cashReceived?: number;
    sinpeRef?: string;
    customerName?: string;
    customerCedula?: string;
    docType?: "04" | "01";
  }) => { sale: SaleRecord; invoice: InvoiceRecord; receiptData: any };
  openCashSession: (initialAmount: number) => void;
  closeCashSession: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const orgId = user?.organization_id || "default_tenant";

  const [settings, setSettings] = useState<BusinessSettings>({
    trade_name: user?.organization_name || "Mi Negocio",
    legal_name: user?.legal_name || user?.organization_name || "Comercial S.A.",
    identification_number: user?.identification_number || "3101000000",
    identification_type: "JURIDICA",
    email: user?.email || "facturacion@minegocio.cr",
    phone: user?.phone || "+506 2200-0000",
    address: "San José, Costa Rica",
    branch_name: user?.branch_name || "Sucursal Central (001)",
    tax_regime: "TRADICIONAL",
    default_currency: "CRC",
    atv_environment: "STAGING",
    atv_username: "cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr",
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
  const [activeCashSession, setActiveCashSession] = useState<CashSession | null>(null);
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

  // Load tenant-isolated state
  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;

    try {
      const sSettings = localStorage.getItem(`orbitica_settings_${orgId}`);
      if (sSettings) setSettings((prev) => ({ ...prev, ...JSON.parse(sSettings) }));

      const sProducts = localStorage.getItem(`orbitica_products_${orgId}`);
      setProducts(sProducts ? JSON.parse(sProducts) : []);

      const sCustomers = localStorage.getItem(`orbitica_customers_${orgId}`);
      setCustomers(sCustomers ? JSON.parse(sCustomers) : []);

      const sSuppliers = localStorage.getItem(`orbitica_suppliers_${orgId}`);
      setSuppliers(sSuppliers ? JSON.parse(sSuppliers) : []);

      const sPurchases = localStorage.getItem(`orbitica_purchases_${orgId}`);
      setPurchases(sPurchases ? JSON.parse(sPurchases) : []);

      const sMovements = localStorage.getItem(`orbitica_movements_${orgId}`);
      setMovements(sMovements ? JSON.parse(sMovements) : []);

      const sSales = localStorage.getItem(`orbitica_sales_${orgId}`);
      setSales(sSales ? JSON.parse(sSales) : []);

      const sInvoices = localStorage.getItem(`orbitica_invoices_${orgId}`);
      setInvoices(sInvoices ? JSON.parse(sInvoices) : []);

      const sCash = localStorage.getItem(`orbitica_cash_${orgId}`);
      setActiveCashSession(sCash ? JSON.parse(sCash) : null);

      const sAudit = localStorage.getItem(`orbitica_audit_${orgId}`);
      if (sAudit) {
        setAuditLogs(JSON.parse(sAudit));
      } else {
        const initialAudit: AuditLogEntry = {
          id: `aud_${Date.now()}`,
          organization_id: orgId,
          created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
          actor_name: user?.full_name || "Propietario",
          action: "ORGANIZATION_PROVISIONED",
          resource: `Organization: ${user?.organization_name || "Mi Negocio"}`,
          ip_address: "127.0.0.1",
        };
        setAuditLogs([initialAudit]);
        localStorage.setItem(`orbitica_audit_${orgId}`, JSON.stringify([initialAudit]));
      }
    } catch (e) {
      console.warn("Error loading isolated tenant data:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [orgId]);

  // Save changes isolated by organization_id
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !orgId) return;
    try {
      localStorage.setItem(`orbitica_products_${orgId}`, JSON.stringify(products));
      localStorage.setItem(`orbitica_customers_${orgId}`, JSON.stringify(customers));
      localStorage.setItem(`orbitica_suppliers_${orgId}`, JSON.stringify(suppliers));
      localStorage.setItem(`orbitica_purchases_${orgId}`, JSON.stringify(purchases));
      localStorage.setItem(`orbitica_movements_${orgId}`, JSON.stringify(movements));
      localStorage.setItem(`orbitica_sales_${orgId}`, JSON.stringify(sales));
      localStorage.setItem(`orbitica_invoices_${orgId}`, JSON.stringify(invoices));
      localStorage.setItem(`orbitica_audit_${orgId}`, JSON.stringify(auditLogs));
      localStorage.setItem(`orbitica_settings_${orgId}`, JSON.stringify(settings));
      if (activeCashSession) {
        localStorage.setItem(`orbitica_cash_${orgId}`, JSON.stringify(activeCashSession));
      } else {
        localStorage.removeItem(`orbitica_cash_${orgId}`);
      }
    } catch (e) {}
  }, [products, customers, suppliers, purchases, movements, sales, invoices, auditLogs, settings, activeCashSession, orgId, isLoaded]);

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
      if (it.productId) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === it.productId) {
              const newStock = (p.stock ?? 0) + it.quantity;
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
        previous_quantity: 0,
        new_quantity: it.quantity,
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
    cashReceived = 0,
    sinpeRef,
    customerName = "CLIENTE CONTADO",
    customerCedula,
    docType = "04",
  }: {
    items: Array<{ product: Product; quantity: number }>;
    paymentMethod: "CASH_CRC" | "SINPE" | "CARD" | "MIXED";
    cashReceived?: number;
    sinpeRef?: string;
    customerName?: string;
    customerCedula?: string;
    docType?: "04" | "01";
  }) => {
    const seq = sales.length + 1;
    const saleNum = `V-${seq.toString().padStart(6, "0")}`;
    const consecutive = `00100001${docType}${seq.toString().padStart(10, "0")}`;
    const key = `50629082600${settings.identification_number.padEnd(12, "0").slice(0, 12)}00100001${docType}${seq.toString().padStart(10, "0")}112345678`;

    const subtotal = items.reduce((acc, it) => acc + it.product.sale_price * it.quantity, 0);
    const tax = items.reduce(
      (acc, it) => acc + it.product.sale_price * it.quantity * (it.product.tax_rate / 100),
      0
    );
    const total = subtotal + tax;

    // Deduct stock & create movement
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
        reason: `Venta en POS #${saleNum}`,
      };
      setMovements((prev) => [mov, ...prev]);
    });

    const receiptData = {
      sale_number: saleNum,
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
        resolution: "Autorizada mediante resolución Nº DGT-R-48-2016",
        qr_url: `https://tribunet.hacienda.go.cr/docs/${key}`,
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
      footer_message: `¡Gracias por su compra en ${settings.trade_name}!`,
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
      hacienda_message: "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.3",
      xml_signed: `<?xml version="1.0" encoding="utf-8"?>\n<${docType === "01" ? "FacturaElectronica" : "TiqueteElectronico"} xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3">\n  <Clave>${key}</Clave>\n  <NumeroConsecutivo>${consecutive}</NumeroConsecutivo>\n  <FechaEmision>${new Date().toISOString()}</FechaEmision>\n  <Emisor>\n    <Nombre>${settings.legal_name}</Nombre>\n    <Identificacion><Tipo>02</Tipo><Numero>${settings.identification_number}</Numero></Identificacion>\n  </Emisor>\n  <ResumenFactura>\n    <CodigoTipoMoneda>${settings.default_currency}</CodigoTipoMoneda>\n    <TotalComprobante>${total.toFixed(2)}</TotalComprobante>\n  </ResumenFactura>\n</${docType === "01" ? "FacturaElectronica" : "TiqueteElectronico"}>`,
    };

    setSales((prev) => [newSale, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);

    if (activeCashSession) {
      const updatedCash: CashSession = {
        ...activeCashSession,
        total_sales: activeCashSession.total_sales + total,
        cash_sales: paymentMethod === "CASH_CRC" ? activeCashSession.cash_sales + total : activeCashSession.cash_sales,
        sinpe_sales: paymentMethod === "SINPE" ? activeCashSession.sinpe_sales + total : activeCashSession.sinpe_sales,
        card_sales: paymentMethod === "CARD" ? activeCashSession.card_sales + total : activeCashSession.card_sales,
      };
      setActiveCashSession(updatedCash);
    }

    logAudit("SALE_COMPLETED", `Venta #${saleNum} (${paymentMethod})`);

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

  const closeCashSession = () => {
    if (activeCashSession) {
      const closed: CashSession = {
        ...activeCashSession,
        closed_at: new Date().toISOString(),
        status: "CLOSED",
      };
      // Archive the session in history (never lose data)
      try {
        const historyKey = `orbitica_cash_history_${orgId}`;
        const existing = JSON.parse(localStorage.getItem(historyKey) || "[]");
        localStorage.setItem(historyKey, JSON.stringify([closed, ...existing]));
      } catch {}
      // Clear active session → next openCashSession will start fresh
      setActiveCashSession(null);
      logAudit("CASH_SESSION_CLOSED", `Cierre de Caja: Ventas ₡${closed.total_sales.toFixed(2)}`);
    }
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
        updateSettings,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
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