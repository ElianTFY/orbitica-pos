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
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check,
  Play,
  Copy,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api-client";

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
    customers,
    addCustomer,
    onboarding,
    updateOnboarding,
    retryFetch,
  } = useStore();

  const [currentStep, setCurrentStep] = useState<number>(onboarding?.current_step || 1);

  // Step 1: Business Details (STARTS COMPLETELY CLEAN)
  const [tradeName, setTradeName] = useState(settings.trade_name || "");
  const [legalName, setLegalName] = useState(settings.legal_name || "");
  const [idType, setIdType] = useState<"FISICA" | "JURIDICA" | "DIMEX">(settings.identification_type || "JURIDICA");
  const [idNumber, setIdNumber] = useState(settings.identification_number || "");
  const [phone, setPhone] = useState(settings.phone || "");
  const [email, setEmail] = useState(settings.email || "");
  const [province, setProvince] = useState("San José");
  const [canton, setCanton] = useState("Central");
  const [district, setDistrict] = useState("Catedral");
  const [address, setAddress] = useState(settings.address || "");
  const [businessType, setBusinessType] = useState("retail");
  const [defaultCurrency, setDefaultCurrency] = useState<"CRC" | "USD">("CRC");

  // Step 2: Fiscal Setup (Hacienda DGT v4.4)
  const [taxRegime, setTaxRegime] = useState<"TRADICIONAL" | "SIMPLIFICADO">("TRADICIONAL");
  const [atvEnv, setAtvEnv] = useState<"STAGING" | "PRODUCTION">("STAGING");
  const [atvUsername, setAtvUsername] = useState("");
  const [atvPassword, setAtvPassword] = useState("");
  const [atvPin, setAtvPin] = useState("");
  const [isTestingAtv, setIsTestingAtv] = useState(false);
  const [atvStatus, setAtvStatus] = useState<"NOT_TESTED" | "SUCCESS" | "FAILED">("NOT_TESTED");
  const [atvMessage, setAtvMessage] = useState("");

  // Step 3: Branch & Printer
  const [branchName, setBranchName] = useState(settings.branch_name || "Sucursal Principal");
  const [terminalName, setTerminalName] = useState("Caja POS 01");
  const [printerPaperSize, setPrinterPaperSize] = useState<"80mm" | "58mm">("80mm");

  // Step 4: Payments
  const [paymentsActive, setPaymentsActive] = useState({
    cash_crc: true,
    cash_usd: true,
    card: true,
    sinpe: true,
    transfer: true,
  });
  const [sinpeNumber, setSinpeNumber] = useState("");

  // Step 5: Initial Product (STARTS COMPLETELY BLANK)
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdTax, setNewProdTax] = useState("13");
  const [prodSaved, setProdSaved] = useState(false);

  // Step 6: Initial Customer (STARTS COMPLETELY BLANK)
  const [newCustName, setNewCustName] = useState("");
  const [newCustId, setNewCustId] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [custSaved, setCustSaved] = useState(false);

  // Sync settings when available
  useEffect(() => {
    if (settings.trade_name && !tradeName) setTradeName(settings.trade_name);
    if (settings.legal_name && !legalName) setLegalName(settings.legal_name);
    if (settings.identification_number && !idNumber) setIdNumber(settings.identification_number);
    if (settings.phone && !phone) setPhone(settings.phone);
    if (settings.email && !email) setEmail(settings.email);
    if (settings.address && !address) setAddress(settings.address);
  }, [settings]);

  // Optional: Explicitly copy user account data to business fields
  const handleUseAccountData = () => {
    if (user) {
      if (!tradeName && user.organization_name) setTradeName(user.organization_name);
      if (!phone && user.phone) setPhone(user.phone);
      if (!email && user.email) setEmail(user.email);
    }
  };

  // Test ATV Connection - NEVER simulates success with fake fallbacks
  const handleTestAtv = async () => {
    if (!atvUsername.trim() || !atvPin.trim()) {
      setAtvStatus("FAILED");
      setAtvMessage("Ingresa el usuario ATV y el PIN de 4 dígitos para probar la conexión con Hacienda.");
      return;
    }

    setIsTestingAtv(true);
    setAtvMessage("");
    try {
      const res = await api.request<any>("/hacienda/test-connection", {
        method: "POST",
        body: JSON.stringify({
          environment: atvEnv,
          username: atvUsername.trim(),
          pin: atvPin.trim(),
        }),
      });
      setAtvStatus("SUCCESS");
      setAtvMessage(res.data?.message || "Conexión validada exitosamente con el Ministerio de Hacienda.");
    } catch (err: any) {
      setAtvStatus("FAILED");
      setAtvMessage(err?.message || "No se pudo conectar con los servidores de Hacienda. Verifica tus credenciales.");
    } finally {
      setIsTestingAtv(false);
    }
  };

  // Step 1 Save -> Persists to PostgreSQL
  const handleSaveStep1 = () => {
    updateSettings({
      trade_name: tradeName.trim(),
      legal_name: legalName.trim(),
      identification_type: idType,
      identification_number: idNumber.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim() ? `${address.trim()}, ${district}, ${canton}, ${province}` : "",
      default_currency: defaultCurrency,
    });
    updateOnboarding({ current_step: 2, steps: { ...onboarding.steps, business: true } });
    setCurrentStep(2);
  };

  // Step 2 Save
  const handleSaveStep2 = () => {
    updateSettings({
      tax_regime: taxRegime,
      atv_environment: atvEnv,
      atv_username: atvUsername.trim(),
    });
    updateOnboarding({ current_step: 3, steps: { ...onboarding.steps, fiscal: true } });
    setCurrentStep(3);
  };

  // Step 3 Save
  const handleSaveStep3 = () => {
    if (branches.length === 0 && branchName.trim()) {
      addBranch({
        code: "001",
        name: branchName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        is_main: true,
        is_active: true,
      });
    }
    updateOnboarding({ current_step: 4, steps: { ...onboarding.steps, branches: true } });
    setCurrentStep(4);
  };

  // Step 4 Save
  const handleSaveStep4 = () => {
    updateOnboarding({ current_step: 5, steps: { ...onboarding.steps, payments: true } });
    setCurrentStep(5);
  };

  // Step 5: Add Product (Only if entered, no fake defaults)
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

  // Step 6: Add Customer (Only if entered, no fake defaults)
  const handleAddQuickCustomer = () => {
    if (!newCustName.trim()) return;
    addCustomer({
      name: newCustName.trim(),
      identification_type: "FISICA",
      identification_number: newCustId.trim() || "",
      email: newCustEmail.trim() || undefined,
      phone: newCustPhone.trim() || undefined,
      is_active: true,
    });
    setCustSaved(true);
    updateOnboarding({ steps: { ...onboarding.steps, contacts: true } });
  };

  // Step 7: Final Activation -> marks onboarding complete in PostgreSQL
  const handleFinishOnboarding = async () => {
    updateOnboarding({
      current_step: 7,
      is_completed: true,
      steps: {
        ...onboarding.steps,
        business: true,
        fiscal: true,
        branches: true,
        payments: true,
      },
    });
    await retryFetch();
    router.push("/dashboard");
  };

  const stepsList = [
    { num: 1, title: "Negocio", icon: Building2 },
    { num: 2, title: "Fiscal CR", icon: FileText },
    { num: 3, title: "Sucursal", icon: Store },
    { num: 4, title: "Pagos", icon: CreditCard },
    { num: 5, title: "Productos", icon: Package },
    { num: 6, title: "Clientes", icon: Users },
    { num: 7, title: "Activación", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background text-text-main p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-5 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="blue">CONFIGURACIÓN COMERCIAL</Badge>
              <span className="text-xs text-text-muted">Período de prueba activo</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-text-main">
              Asistente de Configuración de Negocio
            </h1>
            <p className="text-xs text-text-muted">
              Prepara tu comercio para facturar electrónicamente según la normativa de la DGT de Costa Rica.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-text-main">
              Omitir por ahora →
            </Button>
          </Link>
        </div>

        {/* 7-Step Navigation Tracker */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
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
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-black text-text-main flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Paso 1: Datos de tu Empresa o Comercio
                  </h2>
                  <p className="text-xs text-text-muted">
                    Información legal y fiscal que identificará tu comercio ante Hacienda y en tus comprobantes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleUseAccountData}
                  className="text-xs shrink-0 gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Usar datos de mi cuenta
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Nombre Comercial (Fantasía) *
                  </label>
                  <Input
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ej. Minisuper El Sol, Boutique Florencia..."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Razón Social Legal (según Registro Nacional)
                  </label>
                  <Input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ej. Inversiones del Valle S.A."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Tipo de Identificación
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
                    Número de Cédula o Identificación
                  </label>
                  <Input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ingresa los dígitos sin guiones"
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Teléfono del Negocio
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +506 2200-0000"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Correo Electrónico de Facturación
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="facturacion@tunegocio.cr"
                    className="text-xs"
                    type="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Provincia
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
                    Moneda Principal
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main font-bold"
                  >
                    <option value="CRC">Colones Costarricenses (₡ CRC)</option>
                    <option value="USD">Dólares Americanos ($ USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Dirección Exacta del Local
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. De la Iglesia 100m norte, frente al parque"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="primary" onClick={handleSaveStep1} className="gap-2 text-xs font-bold">
                  Guardar y Continuar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: FISCAL HACIENDA CR */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Paso 2: Facturación Electrónica Hacienda (v4.4)
                </h2>
                <p className="text-xs text-text-muted">
                  Configura tus credenciales ATV del Ministerio de Hacienda de Costa Rica o pospón la configuración.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Régimen Tributario
                  </label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="TRADICIONAL">Régimen Tradicional (General)</option>
                    <option value="SIMPLIFICADO">Régimen de Tributación Simplificada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Ambiente ATV
                  </label>
                  <select
                    value={atvEnv}
                    onChange={(e) => setAtvEnv(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main font-bold"
                  >
                    <option value="STAGING">Ambiente de Pruebas (Staging Hacienda)</option>
                    <option value="PRODUCTION">Ambiente Real (Producción DGT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Usuario ATV (Generado en portal ATV)
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
                    PIN de 4 dígitos de la Llave Criptográfica
                  </label>
                  <Input
                    value={atvPin}
                    onChange={(e) => setAtvPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    maxLength={4}
                    type="password"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Real Connection Validation Box */}
              <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-main">Prueba de Conexión en Línea con Hacienda</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleTestAtv}
                    disabled={isTestingAtv || !atvUsername.trim() || !atvPin.trim()}
                    className="text-xs"
                  >
                    {isTestingAtv ? "Verificando..." : "Probar Conexión con DGT"}
                  </Button>
                </div>
                {atvMessage && (
                  <p className={`text-xs ${atvStatus === "SUCCESS" ? "text-emerald-500 font-bold" : "text-semantic-danger-text"}`}>
                    {atvMessage}
                  </p>
                )}
                <p className="text-[11px] text-text-muted">
                  Si aún no tienes tus credenciales de Hacienda, puedes continuar y cargarlas más adelante en el menú de Configuración.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(1)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button variant="primary" onClick={handleSaveStep2} className="gap-2 text-xs font-bold">
                  Guardar y Continuar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCURSAL Y CAJA */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Paso 3: Sucursal y Punto de Venta
                </h2>
                <p className="text-xs text-text-muted">
                  Configura tu punto físico de venta y formato de impresión de tiquetes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Nombre de la Sucursal *
                  </label>
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Ej. Sucursal Central, Local Principal..."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Identificador de Caja POS
                  </label>
                  <Input
                    value={terminalName}
                    onChange={(e) => setTerminalName(e.target.value)}
                    placeholder="Ej. Caja 01"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Formato de Impresora Térmica
                  </label>
                  <select
                    value={printerPaperSize}
                    onChange={(e) => setPrinterPaperSize(e.target.value as any)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="80mm">Papel estándar 80mm (Recomendado)</option>
                    <option value="58mm">Papel compacto 58mm (Portátil)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(2)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button variant="primary" onClick={handleSaveStep3} className="gap-2 text-xs font-bold">
                  Guardar y Continuar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: MÉTODOS DE PAGO */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Paso 4: Métodos de Pago Aceptados
                </h2>
                <p className="text-xs text-text-muted">
                  Elige los canales de cobro que estarán disponibles en la pantalla de cobro del POS.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-surface border border-border rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentsActive.cash_crc}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, cash_crc: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-text-main block">Efectivo en Colones (₡ CRC)</span>
                    <span className="text-[11px] text-text-muted">Cálculo de vuelto automático en el POS</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-surface border border-border rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentsActive.card}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, card: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-text-main block">Tarjeta de Crédito / Débito (Datáfono)</span>
                    <span className="text-[11px] text-text-muted">Registro de código de voucher o autorización</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-surface border border-border rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentsActive.sinpe}
                    onChange={(e) => setPaymentsActive({ ...paymentsActive, sinpe: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-text-main block">SINPE Móvil</span>
                    <span className="text-[11px] text-text-muted">Cobro directo con número telefónico y comprobante</span>
                  </div>
                </label>

                {paymentsActive.sinpe && (
                  <div className="pl-7">
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Número de Teléfono para SINPE Móvil
                    </label>
                    <Input
                      value={sinpeNumber}
                      onChange={(e) => setSinpeNumber(e.target.value)}
                      placeholder="Ej. +506 8888-8888"
                      className="text-xs max-w-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(3)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button variant="primary" onClick={handleSaveStep4} className="gap-2 text-xs font-bold">
                  Guardar y Continuar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: PRIMER PRODUCTO (OPCIONAL) */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Paso 5: Agrega tu Primer Producto (Opcional)
                </h2>
                <p className="text-xs text-text-muted">
                  Puedes registrar un producto ahora o importarlos por lote más adelante en el módulo de Inventario.
                </p>
              </div>

              {prodSaved ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>¡Producto guardado exitosamente en tu catálogo!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Nombre del Producto
                    </label>
                    <Input
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="Ej. Café Molido Gourmet 500g"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Precio de Venta al Público (₡ CRC)
                    </label>
                    <Input
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Costo Unitario (₡ CRC)
                    </label>
                    <Input
                      value={newProdCost}
                      onChange={(e) => setNewProdCost(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Stock Inicial
                    </label>
                    <Input
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Tarifa IVA
                    </label>
                    <select
                      value={newProdTax}
                      onChange={(e) => setNewProdTax(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value="13">13% Tarifa General IVA</option>
                      <option value="4">4% Servicios de Salud</option>
                      <option value="2">2% Medicamentos y Educación</option>
                      <option value="1">1% Canasta Básica</option>
                      <option value="0">0% Exento</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddQuickProduct}
                      disabled={!newProdName.trim() || !newProdPrice.trim()}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Guardar Producto en Catálogo
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(4)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(6)} className="gap-2 text-xs font-bold">
                  {prodSaved || newProdName.trim() ? "Continuar" : "Omitir y Continuar"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: PRIMER CLIENTE (OPCIONAL) */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Paso 6: Directorio de Clientes (Opcional)
                </h2>
                <p className="text-xs text-text-muted">
                  Puedes registrar un cliente frecuente para emitirle facturas electrónicas con crédito o descuento.
                </p>
              </div>

              {custSaved ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>¡Cliente registrado exitosamente!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Nombre Completo o Razón Social
                    </label>
                    <Input
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="Ej. Distribuidora del Este S.A."
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Cédula o Identificación
                    </label>
                    <Input
                      value={newCustId}
                      onChange={(e) => setNewCustId(e.target.value.replace(/\D/g, ""))}
                      placeholder="Sin guiones"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Correo Electrónico
                    </label>
                    <Input
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="cliente@dominio.cr"
                      className="text-xs"
                      type="email"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Teléfono
                    </label>
                    <Input
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="+506 8888-0000"
                      className="text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddQuickCustomer}
                      disabled={!newCustName.trim()}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar Cliente
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(5)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(7)} className="gap-2 text-xs font-bold">
                  {custSaved || newCustName.trim() ? "Continuar" : "Omitir y Continuar"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: ACTIVACIÓN COMERCIAL (FINAL) */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Paso 7: Resumen y Activación Comercial
                </h2>
                <p className="text-xs text-text-muted">
                  Revisa la configuración inicial de tu negocio antes de comenzar a operar en el Punto de Venta.
                </p>
              </div>

              {/* Verified Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>1. Identidad comercial registrada</span>
                </div>
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>2. Configuración fiscal Hacienda</span>
                </div>
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>3. Sucursal y terminal de cobro listos</span>
                </div>
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>4. Métodos de pago y SINPE configurados</span>
                </div>
              </div>

              {/* Ready to Sell Box */}
              <div className="p-5 bg-surface-secondary border border-border rounded-3xl space-y-2">
                <span className="text-xs font-black text-text-main block">
                  Todo listo para comenzar a facturar en {tradeName || "tu negocio"}
                </span>
                <p className="text-xs text-text-muted">
                  Al completar este asistente, todos los datos se guardarán de forma permanente en la base de datos central de Orbítica POS. Podrás modificar o ampliar cualquier dato desde el menú de Configuración.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setCurrentStep(6)} className="gap-2 text-xs">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFinishOnboarding}
                  className="gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 py-3 px-6 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Completar y Entrar al Sistema!
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
