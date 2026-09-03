"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Store,
  CreditCard,
  Package,
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Printer,
  UploadCloud,
  Check,
  Play,
  Trash2,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api-client";
import { formatCRC } from "@/lib/utils";

const CR_PROVINCES = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];

const BUSINESS_TYPES = [
  { id: "retail", name: "Comercio / Tienda Retail", icon: "🛍️" },
  { id: "restaurant", name: "Restaurante / Soda / Cafetería", icon: "☕" },
  { id: "supermarket", name: "Minisuper / Pulpería / Abastecedor", icon: "🛒" },
  { id: "services", name: "Servicios Profesionales / Citas", icon: "💼" },
  { id: "workshop", name: "Taller / Órdenes de Trabajo", icon: "🔧" },
  { id: "pharmacy", name: "Farmacia / Salud", icon: "💊" },
  { id: "wholesale", name: "Distribuidora / Mayorista", icon: "📦" },
];

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    settings,
    updateSettings,
    products,
    addProduct,
    branches,
    addBranch,
    employees,
    addEmployee,
    customers,
    addCustomer,
    onboarding,
    updateOnboarding,
    recordSale,
    purgeTestSales,
    sales,
  } = useStore();

  const [currentStep, setCurrentStep] = useState<number>(onboarding?.current_step || 1);

  // Step 1: Business Details
  const [tradeName, setTradeName] = useState(settings.trade_name || "");
  const [legalName, setLegalName] = useState(settings.legal_name || "");
  const [idType, setIdType] = useState<"FISICA" | "JURIDICA" | "DIMEX">(settings.identification_type || "JURIDICA");
  const [idNumber, setIdNumber] = useState(settings.identification_number || "");
  const [phone, setPhone] = useState(settings.phone || "+506 ");
  const [email, setEmail] = useState(settings.email || user?.email || "");
  const [province, setProvince] = useState("San José");
  const [canton, setCanton] = useState("Central");
  const [district, setDistrict] = useState("Catedral");
  const [address, setAddress] = useState(settings.address || "");
  const [businessType, setBusinessType] = useState("retail");
  const [defaultCurrency, setDefaultCurrency] = useState<"CRC" | "USD">("CRC");

  // Step 2: Fiscal Setup
  const [taxRegime, setTaxRegime] = useState<"TRADICIONAL" | "SIMPLIFICADO">("TRADICIONAL");
  const [atvEnv, setAtvEnv] = useState<"STAGING" | "PRODUCTION">("STAGING");
  const [atvUsername, setAtvUsername] = useState("");
  const [atvPassword, setAtvPassword] = useState("");
  const [atvPin, setAtvPin] = useState("");
  const [isTestingAtv, setIsTestingAtv] = useState(false);
  const [atvStatus, setAtvStatus] = useState<"NOT_TESTED" | "SUCCESS" | "FAILED">("NOT_TESTED");
  const [atvMessage, setAtvMessage] = useState("");

  // Step 3: Branch & Printer
  const [branchName, setBranchName] = useState("Sucursal Central (001)");
  const [terminalName, setTerminalName] = useState("Caja POS 01");
  const [warehouseName, setWarehouseName] = useState("Bodega Principal");
  const [printerPaperSize, setPrinterPaperSize] = useState<"80mm" | "58mm">("80mm");

  // Step 4: Payments
  const [paymentsActive, setPaymentsActive] = useState({
    cash_crc: true,
    cash_usd: true,
    card: true,
    sinpe: true,
    transfer: true,
    credit: true,
  });
  const [sinpeNumber, setSinpeNumber] = useState(settings.phone || "8888-0000");

  // Step 5: Initial Product
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("2500");
  const [newProdCost, setNewProdCost] = useState("1800");
  const [newProdStock, setNewProdStock] = useState("25");
  const [newProdTax, setNewProdTax] = useState("13");
  const [prodSaved, setProdSaved] = useState(false);

  // Step 6: Initial Customer
  const [newCustName, setNewCustName] = useState("");
  const [newCustId, setNewCustId] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [custSaved, setCustSaved] = useState(false);

  // Step 7: Employee Invite
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empRole, setEmpRole] = useState<"CASHIER" | "MANAGER">("CASHIER");
  const [empSaved, setEmpSaved] = useState(false);

  // Step 8: Test Sale State
  const [testSaleDone, setTestSaleDone] = useState(false);
  const [testSaleResult, setTestSaleResult] = useState<any>(null);

  // Save current step on change
  useEffect(() => {
    updateOnboarding({ current_step: currentStep });
  }, [currentStep]);

  // Test ATV Connection
  const handleTestAtv = async () => {
    setIsTestingAtv(true);
    setAtvMessage("");
    try {
      const res = await api.request<any>("/hacienda/test-connection", {
        method: "POST",
        body: JSON.stringify({
          environment: atvEnv,
          username: atvUsername || "cpf-01-0000-0000@stag.comprobanteselectronicos.go.cr",
          pin: atvPin || "1234",
        }),
      });
      setAtvStatus("SUCCESS");
      setAtvMessage(res.data?.message || "Conexión con Ministerio de Hacienda CR exitosa.");
    } catch (err: any) {
      setAtvStatus("FAILED");
      setAtvMessage(err?.message || "No se pudo conectar con los servidores de Hacienda.");
    } finally {
      setIsTestingAtv(false);
    }
  };

  // Step 1 Save
  const handleSaveStep1 = () => {
    updateSettings({
      trade_name: tradeName || "Mi Negocio",
      legal_name: legalName || tradeName || "Mi Negocio S.A.",
      identification_type: idType,
      identification_number: idNumber,
      phone,
      email,
      address: `${address}, ${district}, ${canton}, ${province}`,
      default_currency: defaultCurrency,
    });
    updateOnboarding({ steps: { ...onboarding.steps, business: true } });
    setCurrentStep(2);
  };

  // Step 2 Save
  const handleSaveStep2 = () => {
    updateSettings({
      tax_regime: taxRegime,
      atv_environment: atvEnv,
      atv_username: atvUsername,
    });
    updateOnboarding({ steps: { ...onboarding.steps, fiscal: true } });
    setCurrentStep(3);
  };

  // Step 3 Save
  const handleSaveStep3 = () => {
    if (branches.length === 0) {
      addBranch({
        code: "001",
        name: branchName,
        address,
        phone,
        is_main: true,
        is_active: true,
      });
    }
    updateOnboarding({ steps: { ...onboarding.steps, branches: true } });
    setCurrentStep(4);
  };

  // Step 4 Save
  const handleSaveStep4 = () => {
    updateOnboarding({ steps: { ...onboarding.steps, payments: true } });
    setCurrentStep(5);
  };

  // Step 5: Add Product
  const handleAddQuickProduct = () => {
    if (!newProdName.trim()) return;
    addProduct({
      name: newProdName.trim(),
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      sale_price: Number(newProdPrice) || 0,
      cost_price: Number(newProdCost) || 0,
      stock: Number(newProdStock) || 0,
      tax_rate: Number(newProdTax) || 13,
      min_stock_alert: 5,
      category_name: "General",
    });
    setProdSaved(true);
    updateOnboarding({ steps: { ...onboarding.steps, products: true } });
  };

  // Step 6: Add Customer
  const handleAddQuickCustomer = () => {
    if (!newCustName.trim()) return;
    addCustomer({
      name: newCustName.trim(),
      identification_type: "FISICA",
      identification_number: newCustId.trim() || "000000000",
      email: newCustEmail.trim() || "cliente@ejemplo.cr",
      phone: "+506 8888-0000",
      is_active: true,
    });
    setCustSaved(true);
    updateOnboarding({ steps: { ...onboarding.steps, contacts: true } });
  };

  // Step 7: Invite Employee
  const handleAddQuickEmployee = () => {
    if (!empName.trim()) return;
    addEmployee({
      full_name: empName.trim(),
      email: empEmail.trim() || "empleado@negocio.cr",
      role: empRole,
      branch_name: branchName,
      is_active: true,
    });
    setEmpSaved(true);
    updateOnboarding({ steps: { ...onboarding.steps, users: true } });
  };

  // Step 8: Execute Test Sale
  const handleExecuteTestSale = () => {
    const activeProd = products.length > 0
      ? products[0]
      : {
          id: `prod_sample_${Date.now()}`,
          organization_id: user?.organization_id || "",
          name: "Producto Inicial de Muestra",
          sale_price: 1500,
          cost_price: 1000,
          min_stock_alert: 5,
          tax_rate: 13,
          stock: 50,
        };

    const res = recordSale({
      items: [{ product: activeProd, quantity: 1 }],
      paymentMethod: "CASH_CRC",
      cashReceived: 2000,
      customerName: "CLIENTE DE PRUEBA (ONBOARDING)",
      docType: "04",
      isTest: true,
    });

    setTestSaleResult(res);
    setTestSaleDone(true);
    updateOnboarding({ steps: { ...onboarding.steps, test_sale: true } });
  };

  const handleFinishOnboarding = () => {
    updateOnboarding({ is_completed: true });
    router.push("/dashboard");
  };

  const stepsList = [
    { num: 1, title: "Negocio", icon: Building2 },
    { num: 2, title: "Fiscal CR", icon: FileText },
    { num: 3, title: "Sucursal", icon: Store },
    { num: 4, title: "Pagos", icon: CreditCard },
    { num: 5, title: "Productos", icon: Package },
    { num: 6, title: "Contactos", icon: Users },
    { num: 7, title: "Equipo", icon: UserPlus },
    { num: 8, title: "Prueba POS", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background text-text-main p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-5 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="blue">ONBOARDING GUIADO AUTÓNOMO</Badge>
              <span className="text-xs text-text-muted">14 días de prueba Crece</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-text-main">
              Configuración Inicial de Orbítica POS
            </h1>
            <p className="text-xs text-text-muted">
              Prepara tu negocio para emitir facturación electrónica y vender en menos de 15 minutos.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-text-main">
              Continuar luego →
            </Button>
          </Link>
        </div>

        {/* 8-Step Navigation Tracker */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {stepsList.map((st) => {
            const Icon = st.icon;
            const isDone = st.num < currentStep;
            const isCurrent = st.num === currentStep;
            return (
              <button
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  isCurrent
                    ? "bg-primary text-white border-primary shadow-md scale-105"
                    : isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-surface border-border text-text-muted hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-black/10 dark:bg-white/10">
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] font-bold truncate max-w-full">
                  {st.num}. {st.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step Contents */}
        <Card className="p-6 border border-border shadow-md">
          {/* STEP 1: BUSINESS DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Paso 1: Datos de tu Empresa o Comercio
                </h2>
                <p className="text-xs text-text-muted">
                  Información legal y comercial que aparecerá en tus comprobantes fiscales y tiquetes POS.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Nombre Comercial (Fantasía) *
                  </label>
                  <Input
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ej. Soda La Parada / Super El Pueblo"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Razón Social Legal *
                  </label>
                  <Input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ej. Inversiones Gastronómicas S.A."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Tipo de Identificación *
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="JURIDICA">Cédula Jurídica (10 dígitos)</option>
                    <option value="FISICA">Cédula Física (9 dígitos)</option>
                    <option value="DIMEX">DIMEX (11-12 dígitos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Número de Cédula *
                  </label>
                  <Input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="3101000000"
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Teléfono del Negocio *
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+506 2222-0000"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Correo para Facturación *
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="facturacion@negocio.cr"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Provincia *
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    {CR_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Dirección Exacta *
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="100m norte del parque central, frente a la farmacia"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">
                  Tipo / Giro de Negocio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      type="button"
                      onClick={() => setBusinessType(bt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        businessType === bt.id
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border bg-surface hover:bg-surface-secondary text-text-secondary"
                      }`}
                    >
                      <span className="text-xl block mb-1">{bt.icon}</span>
                      <span className="text-xs block font-bold leading-tight">{bt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="primary" onClick={handleSaveStep1} className="gap-2 font-bold text-xs">
                  Guardar y Continuar al Paso 2
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: FISCAL CR ATV */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Paso 2: Facturación Electrónica Hacienda v4.4 (ATV)
                </h2>
                <p className="text-xs text-text-muted">
                  Configura tus credenciales del Ministerio de Hacienda de Costa Rica para emisión fiscal automática.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Régimen Tributario *
                  </label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="TRADICIONAL">Régimen Tradicional (IVA 13% General)</option>
                    <option value="SIMPLIFICADO">Régimen de Tributación Simplificada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Ambiente de Conexión *
                  </label>
                  <select
                    value={atvEnv}
                    onChange={(e) => setAtvEnv(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="STAGING">Staging (Pruebas / Sandbox de Hacienda)</option>
                    <option value="PRODUCTION">Producción Real (Hacienda Costa Rica)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Usuario ATV (Comprobantes Electrónicos)
                  </label>
                  <Input
                    value={atvUsername}
                    onChange={(e) => setAtvUsername(e.target.value)}
                    placeholder="cpf-01-xxxx-xxxx@stag.comprobanteselectronicos.go.cr"
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    PIN Criptográfico (4 dígitos)
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={atvPin}
                    onChange={(e) => setAtvPin(e.target.value)}
                    placeholder="••••"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold text-text-main block">Prueba de Conexión en Vivo</span>
                      <span className="text-[10px] text-text-muted block">
                        Verifica que tus credenciales alcancen los servidores de Hacienda CR
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTestAtv}
                    disabled={isTestingAtv}
                    className="text-xs font-bold"
                  >
                    Probar Conexión ATV
                  </Button>
                </div>

                {atvStatus === "SUCCESS" && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>✓ {atvMessage}</span>
                  </div>
                )}
                {atvStatus === "FAILED" && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{atvMessage}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(1)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button variant="primary" onClick={handleSaveStep2} className="gap-2 font-bold text-xs">
                  Guardar y Continuar al Paso 3
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: BRANCHES & PRINTER */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Paso 3: Sucursal Principal y Configuración de Impresión
                </h2>
                <p className="text-xs text-text-muted">
                  Estructura física de tu punto de venta y formato de tiquete térmico.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Nombre de la Sucursal Principal *
                  </label>
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Sucursal Central (001)"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Caja POS Inicial *
                  </label>
                  <Input
                    value={terminalName}
                    onChange={(e) => setTerminalName(e.target.value)}
                    placeholder="Caja POS 01"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Bodega Principal de Inventario *
                  </label>
                  <Input
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    placeholder="Bodega Central"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Formato de Impresora Térmica *
                  </label>
                  <select
                    value={printerPaperSize}
                    onChange={(e) => setPrinterPaperSize(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="80mm">80 mm (Estándar Punto de Venta Epson / Bixolon)</option>
                    <option value="58mm">58 mm (Impresora Móvil / Tiquete Compacto)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center gap-3">
                <Printer className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-text-main block">Modo de Impresión Directa y PDF</span>
                  <span className="text-text-muted">
                    Orbítica POS soporta impresión automática con corte de papel y apertura de gaveta de dinero.
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(2)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button variant="primary" onClick={handleSaveStep3} className="gap-2 font-bold text-xs">
                  Guardar y Continuar al Paso 4
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENTS */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Paso 4: Métodos de Pago Activos
                </h2>
                <p className="text-xs text-text-muted">
                  Elige las formas de pago que aceptarás en tu caja y configura tu número SINPE Móvil.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">💵 Efectivo en Colones (₡)</span>
                    <span className="text-[10px] text-text-muted">Cálculo de vuelto automático</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentsActive.cash_crc}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, cash_crc: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>

                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">💳 Tarjetas de Crédito / Débito</span>
                    <span className="text-[10px] text-text-muted">Datafono / Terminal POS</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentsActive.card}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, card: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>

                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">📱 SINPE Móvil Costa Rica</span>
                    <span className="text-[10px] text-text-muted">Verificación con comprobante / ref</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentsActive.sinpe}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, sinpe: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>

                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">🏛️ Transferencia Bancaria IBAN</span>
                    <span className="text-[10px] text-text-muted">BAC, BNCR, BCR, etc.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentsActive.transfer}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, transfer: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Número de Teléfono para SINPE Móvil Comercial
                </label>
                <Input
                  value={sinpeNumber}
                  onChange={(e) => setSinpeNumber(e.target.value)}
                  placeholder="+506 8888-0000"
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(3)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button variant="primary" onClick={handleSaveStep4} className="gap-2 font-bold text-xs">
                  Guardar y Continuar al Paso 5
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: PRODUCTS */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Paso 5: Catálogo Inicial de Productos
                </h2>
                <p className="text-xs text-text-muted">
                  Crea tu primer producto para el POS o utiliza el importador de Excel.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual Product Creation */}
                <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-3">
                  <span className="text-xs font-black text-text-main block">Opción A: Crear Producto Manual</span>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">Nombre del Producto *</label>
                    <Input
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="Ej. Café Molido Gourmet 500g"
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">Precio Venta (₡) *</label>
                      <Input
                        type="number"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">Stock Inicial *</label>
                      <Input
                        type="number"
                        value={newProdStock}
                        onChange={(e) => setNewProdStock(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddQuickProduct}
                    className="w-full text-xs font-bold"
                  >
                    {prodSaved ? "✓ Producto Creado" : "+ Agregar al Catálogo"}
                  </Button>
                </div>

                {/* Excel Migration Link */}
                <div className="p-4 bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-black text-primary block">Opción B: Migrar desde Excel / CSV</span>
                    <p className="text-[11px] text-text-muted mt-1">
                      ¿Tienes una lista de cientos de productos? Utiliza nuestro Centro de Migración con auto-detección de columnas y rollback.
                    </p>
                  </div>
                  <Link href="/migration">
                    <Button variant="secondary" size="sm" className="w-full text-xs font-bold gap-1.5">
                      <UploadCloud className="w-4 h-4 text-primary" />
                      Ir al Centro de Migración
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(4)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(6)} className="gap-2 font-bold text-xs">
                  Continuar al Paso 6
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: CUSTOMERS */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Paso 6: Clientes y Proveedores
                </h2>
                <p className="text-xs text-text-muted">
                  Registra clientes frecuentes para emisión rápida de Factura Electrónica (01).
                </p>
              </div>

              <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-3 max-w-lg">
                <span className="text-xs font-black text-text-main block">Registrar Cliente Inicial</span>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Nombre o Razón Social</label>
                  <Input
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Ej. Distribuidora Central CR"
                    className="text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">Cédula</label>
                    <Input
                      value={newCustId}
                      onChange={(e) => setNewCustId(e.target.value)}
                      placeholder="3101000000"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">Correo Electrónico</label>
                    <Input
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="cliente@dominio.cr"
                      className="text-xs"
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddQuickCustomer}
                  className="w-full text-xs font-bold"
                >
                  {custSaved ? "✓ Cliente Guardado" : "+ Guardar Cliente"}
                </Button>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(5)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(7)} className="gap-2 font-bold text-xs">
                  Continuar al Paso 7
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: USERS & PERMISSIONS */}
          {currentStep === 7 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Paso 7: Invitar Colaboradores y Permisos
                </h2>
                <p className="text-xs text-text-muted">
                  Agrega cajeros y administradores con accesos restringidos por sucursal.
                </p>
              </div>

              <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-3 max-w-lg">
                <span className="text-xs font-black text-text-main block">Invitar Colaborador</span>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">Nombre Completo</label>
                  <Input
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="Ej. Laura Solano V."
                    className="text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">Correo de Invitación</label>
                    <Input
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="laura@negocio.cr"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">Rol Operativo</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value="CASHIER">Cajero POS (Solo Ventas)</option>
                      <option value="MANAGER">Encargado / Administrador</option>
                    </select>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddQuickEmployee}
                  className="w-full text-xs font-bold"
                >
                  {empSaved ? "✓ Colaborador Invitado" : "Enviar Invitación"}
                </Button>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(6)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(8)} className="gap-2 font-bold text-xs">
                  Continuar al Paso 8 (Prueba del Sistema)
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 8: SYSTEM TEST CHECKLIST & FIRST SALE */}
          {currentStep === 8 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  Paso 8: Lista de Verificación y Primera Venta de Prueba
                </h2>
                <p className="text-xs text-text-muted">
                  Comprueba el funcionamiento de la caja y emite una venta de prueba que puedes eliminar sin afectar consecutivos oficiales.
                </p>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>1. Datos del negocio registrados</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>2. Ambiente fiscal Hacienda configurado</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>3. Sucursal y bodega activas</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>4. Métodos de pago y SINPE configurados</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>5. Catálogo inicial listo para vender</span>
                </div>
                <div className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold border ${
                  testSaleDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-surface-secondary border-border text-text-muted"
                }`}>
                  {testSaleDone ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>6. Venta de prueba simulada</span>
                </div>
              </div>

              {/* Test Sale Execution Box */}
              <div className="p-5 bg-surface-secondary border border-border rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-xs font-black text-text-main block">Simulación de Venta en Punto de Venta</span>
                    <span className="text-[11px] text-text-muted block">
                      Genera un tiquete de prueba con desglose de IVA y clave numérica de 50 dígitos.
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleExecuteTestSale}
                    className="gap-2 text-xs font-bold bg-primary hover:bg-primary/90"
                  >
                    <Play className="w-4 h-4" />
                    Ejecutar Venta de Prueba
                  </Button>
                </div>

                {testSaleDone && testSaleResult && (
                  <div className="p-4 bg-surface border border-emerald-500/40 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        ¡Venta de Prueba #{testSaleResult.sale.sale_number} Ejecutada con Éxito!
                      </span>
                      <Badge variant="warning">MODO PRUEBA</Badge>
                    </div>
                    <p className="text-[11px] text-text-muted font-mono">
                      Clave Hacienda Simulada: {testSaleResult.sale.numeric_key}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-text-muted">Total Simulado:</span>
                      <span className="font-black text-text-main font-mono">
                        {formatCRC(testSaleResult.sale.total)}
                      </span>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          purgeTestSales();
                          setTestSaleDone(false);
                          setTestSaleResult(null);
                        }}
                        className="text-xs font-bold gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpiar / Purgar Ventas de Prueba
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Finish Actions */}
              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(7)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Paso Anterior
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFinishOnboarding}
                  className="gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 py-3 px-6 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Completar Configuración y Empezar a Vender!
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
