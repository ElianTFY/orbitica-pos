"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Product, SaleRecord, CashSession } from "@/types";

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

export interface InvoiceRecord {
  id: string;
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

const DEFAULT_SAMPLE_PRODUCTS: Product[] = [
  { id: "p1", name: "Coca-Cola 600ml Descartable", barcode: "7441001001", sku: "BEB-001", sale_price: 1200, cost_price: 800, min_stock_alert: 10, tax_rate: 13, category_name: "Bebidas", stock: 48 },
  { id: "p2", name: "Cerveza Imperial 350ml Lata", barcode: "7441002002", sku: "LIC-001", sale_price: 1400, cost_price: 950, min_stock_alert: 24, tax_rate: 13, category_name: "Licores", stock: 35 },
  { id: "p3", name: "Papas Tosty Clásicas 115g", barcode: "7441003003", sku: "SNK-001", sale_price: 850, cost_price: 550, min_stock_alert: 15, tax_rate: 13, category_name: "Snacks", stock: 20 },
  { id: "p4", name: "Café Rey 500g Tradicional", barcode: "7441004004", sku: "ABA-001", sale_price: 2800, cost_price: 2100, min_stock_alert: 8, tax_rate: 1, category_name: "Canasta Básica", stock: 15 },
  { id: "p5", name: "Agua Cristal 600ml Sin Gas", barcode: "7441005005", sku: "BEB-002", sale_price: 700, cost_price: 400, min_stock_alert: 12, tax_rate: 13, category_name: "Bebidas", stock: 50 },
  { id: "p6", name: "Galletas Chiky Chocolate", barcode: "7441006006", sku: "SNK-002", sale_price: 650, cost_price: 420, min_stock_alert: 10, tax_rate: 13, category_name: "Snacks", stock: 30 },
];

interface StoreContextType {
  settings: BusinessSettings;
  products: Product[];
  sales: SaleRecord[];
  invoices: InvoiceRecord[];
  activeCashSession: CashSession | null;
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  addProduct: (product: Omit<Product, "id">) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  importSampleProducts: () => void;
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
  const orgId = user?.organization_id || "default_org";

  const [settings, setSettings] = useState<BusinessSettings>({
    trade_name: user?.organization_name || "Mi Negocio",
    legal_name: user?.legal_name || user?.organization_name || "Comercial S.A.",
    identification_number: user?.identification_number || "3101000000",
    identification_type: "JURIDICA",
    email: user?.email || "facturacion@minegocio.cr",
    phone: user?.phone || "+506 2200-0000",
    address: "San José Centro, Costa Rica",
    branch_name: user?.branch_name || "Sucursal Central (001)",
    tax_regime: "TRADICIONAL",
    default_currency: "CRC",
    atv_environment: "STAGING",
    atv_username: "cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [activeCashSession, setActiveCashSession] = useState<CashSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync settings with authenticated user
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

  // Load persistent store for this specific organization
  useEffect(() => {
    if (typeof window === "undefined" || !orgId) return;

    try {
      const savedSettings = localStorage.getItem(`orbitica_settings_${orgId}`);
      if (savedSettings) setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));

      const savedProducts = localStorage.getItem(`orbitica_products_${orgId}`);
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        // If demo org, populate with samples; if new real org, start clean with samples ready
        const initial = orgId === "org_sanjose_001" ? DEFAULT_SAMPLE_PRODUCTS : DEFAULT_SAMPLE_PRODUCTS;
        setProducts(initial);
        localStorage.setItem(`orbitica_products_${orgId}`, JSON.stringify(initial));
      }

      const savedSales = localStorage.getItem(`orbitica_sales_${orgId}`);
      if (savedSales) setSales(JSON.parse(savedSales));

      const savedInvoices = localStorage.getItem(`orbitica_invoices_${orgId}`);
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));

      const savedCash = localStorage.getItem(`orbitica_cash_${orgId}`);
      if (savedCash) {
        setActiveCashSession(JSON.parse(savedCash));
      } else {
        // Default open cash session
        const defaultCash: CashSession = {
          id: `cash_${Date.now()}`,
          organization_id: orgId,
          opened_at: new Date().toISOString(),
          initial_amount: 50000,
          cash_sales: 0,
          sinpe_sales: 0,
          card_sales: 0,
          total_sales: 0,
          status: "OPEN",
        };
        setActiveCashSession(defaultCash);
        localStorage.setItem(`orbitica_cash_${orgId}`, JSON.stringify(defaultCash));
      }
    } catch (e) {
      console.warn("Could not load organization store data:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [orgId]);

  // Persist products whenever they change
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !orgId) return;
    try {
      localStorage.setItem(`orbitica_products_${orgId}`, JSON.stringify(products));
    } catch (e) {}
  }, [products, orgId, isLoaded]);

  // Persist sales & invoices
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !orgId) return;
    try {
      localStorage.setItem(`orbitica_sales_${orgId}`, JSON.stringify(sales));
      localStorage.setItem(`orbitica_invoices_${orgId}`, JSON.stringify(invoices));
    } catch (e) {}
  }, [sales, invoices, orgId, isLoaded]);

  // Persist settings
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !orgId) return;
    try {
      localStorage.setItem(`orbitica_settings_${orgId}`, JSON.stringify(settings));
    } catch (e) {}
  }, [settings, orgId, isLoaded]);

  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addProduct = (prod: Omit<Product, "id">): Product => {
    const newProduct: Product = {
      ...prod,
      id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organization_id: orgId,
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const importSampleProducts = () => {
    setProducts(DEFAULT_SAMPLE_PRODUCTS);
  };

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

    // Deduct inventory stock
    setProducts((prev) =>
      prev.map((p) => {
        const itemSold = items.find((it) => it.product.id === p.id);
        if (itemSold) {
          const newStock = Math.max(0, p.stock - itemSold.quantity);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );

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
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      items_count: items.reduce((acc, it) => acc + it.quantity, 0),
      status: "COMPLETED",
    };

    const newInvoice: InvoiceRecord = {
      id: `inv_${Date.now()}`,
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

    // Update active cash session
    if (activeCashSession) {
      const updatedCash: CashSession = {
        ...activeCashSession,
        total_sales: activeCashSession.total_sales + total,
        cash_sales: paymentMethod === "CASH_CRC" ? activeCashSession.cash_sales + total : activeCashSession.cash_sales,
        sinpe_sales: paymentMethod === "SINPE" ? activeCashSession.sinpe_sales + total : activeCashSession.sinpe_sales,
        card_sales: paymentMethod === "CARD" ? activeCashSession.card_sales + total : activeCashSession.card_sales,
      };
      setActiveCashSession(updatedCash);
      try {
        localStorage.setItem(`orbitica_cash_${orgId}`, JSON.stringify(updatedCash));
      } catch (e) {}
    }

    const receiptData = {
      sale_number: saleNum,
      created_at: newSale.created_at,
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
        doc_type: newInvoice.doc_type_label,
        consecutive: consecutive,
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

    return { sale: newSale, invoice: newInvoice, receiptData };
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
    try {
      localStorage.setItem(`orbitica_cash_${orgId}`, JSON.stringify(session));
    } catch (e) {}
  };

  const closeCashSession = () => {
    if (activeCashSession) {
      const closed: CashSession = {
        ...activeCashSession,
        closed_at: new Date().toISOString(),
        status: "CLOSED",
      };
      setActiveCashSession(closed);
      try {
        localStorage.setItem(`orbitica_cash_${orgId}`, JSON.stringify(closed));
      } catch (e) {}
    }
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        products,
        sales,
        invoices,
        activeCashSession,
        updateSettings,
        addProduct,
        updateProduct,
        deleteProduct,
        importSampleProducts,
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