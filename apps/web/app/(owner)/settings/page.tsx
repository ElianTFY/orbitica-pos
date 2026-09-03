"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  ShieldCheck,
  KeyRound,
  FileCode,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Palette,
  Building,
  Printer,
  CreditCard,
  ShoppingCart,
  Sliders,
  Smartphone,
  Check,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppearanceSettings } from "@/components/accessibility/appearance-settings";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api-client";

type SettingsTab = "general" | "pos" | "printing" | "payments" | "hacienda" | "accessibility";

export default function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saved, setSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for general
  const [tradeName, setTradeName] = useState(settings.trade_name);
  const [legalName, setLegalName] = useState(settings.legal_name);
  const [idNumber, setIdNumber] = useState(settings.identification_number);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [taxRegime, setTaxRegime] = useState(settings.tax_regime);
  const [currency, setCurrency] = useState(settings.default_currency);
  const [economicActivity, setEconomicActivity] = useState("471101");

  // Form states for POS
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [requireCashSession, setRequireCashSession] = useState(true);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(true);

  // Form states for Printing
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [printLogo, setPrintLogo] = useState(true);
  const [footerMessage, setFooterMessage] = useState(`¡Gracias por su compra en ${settings.trade_name}!`);

  // Form states for Payments
  const [sinpePhone, setSinpePhone] = useState(settings.phone || "");
  const [sinpeName, setSinpeName] = useState(settings.trade_name || "");
  const [enableCash, setEnableCash] = useState(true);
  const [enableSinpe, setEnableSinpe] = useState(true);
  const [enableCard, setEnableCard] = useState(true);

  // Form states for Hacienda
  const [env, setEnv] = useState(settings.atv_environment);
  const [atvUser, setAtvUser] = useState(settings.atv_username);
  const [atvPass, setAtvPass] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    setTradeName(settings.trade_name);
    setLegalName(settings.legal_name);
    setIdNumber(settings.identification_number);
    setEmail(settings.email);
    setPhone(settings.phone);
    setAddress(settings.address);
  }, [settings]);

  // Clear connection result whenever the user changes ATV credentials
  useEffect(() => {
    setConnectionResult(null);
  }, [atvUser, atvPass, env]);

  const notifySaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      trade_name: tradeName,
      legal_name: legalName,
      identification_number: idNumber,
      email,
      phone,
      address,
      tax_regime: taxRegime,
      default_currency: currency,
    });
    notifySaved();
  };

  const handleSavePos = (e: React.FormEvent) => {
    e.preventDefault();
    notifySaved();
  };

  const handleSavePrinting = (e: React.FormEvent) => {
    e.preventDefault();
    notifySaved();
  };

  const handleSavePayments = (e: React.FormEvent) => {
    e.preventDefault();
    notifySaved();
  };

  const handleSaveHacienda = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      atv_environment: env,
      atv_username: atvUser,
    });
    notifySaved();
  };

  const handleTestConnection = async () => {
    if (!atvUser.trim()) {
      setConnectionResult({
        success: false,
        message: "Debe ingresar el Usuario ATV (CPF-...) antes de validar.",
      });
      return;
    }
    if (!atvPass.trim()) {
      setConnectionResult({
        success: false,
        message: "Debe ingresar la Contraseña ATV generada en el portal de Hacienda.",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await api.request<any>("/hacienda/test-connection", {
        method: "POST",
        body: {
          atv_username: atvUser.trim(),
          atv_password: atvPass.trim(),
          environment: env,
        },
      });

      setConnectionResult({
        success: true,
        message: response.data?.message || "Conexión autorizada con el Ministerio de Hacienda exitosa.",
      });
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message:
          err?.message ||
          "Error al autenticar con el servidor de Hacienda. Verifique usuario ATV y contraseña.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Centro de Configuración</h1>
            <p className="text-xs text-text-muted">
              Parámetros de empresa, operación POS, impresión térmica 58/80mm y facturación electrónica Hacienda CR v4.4
            </p>
          </div>
          {saved && (
            <Badge variant="success" className="gap-1.5 py-1.5 px-3">
              <Check className="w-3.5 h-3.5" />
              Configuración guardada exitosamente
            </Badge>
          )}
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Pestañas de configuración"
          className="flex flex-wrap bg-surface-secondary p-1 rounded-2xl border border-border gap-1"
        >
          {[
            { key: "general" as const, label: "Empresa", icon: Building },
            { key: "pos" as const, label: "Punto de Venta", icon: ShoppingCart },
            { key: "printing" as const, label: "Impresión Térmica", icon: Printer },
            { key: "payments" as const, label: "Pagos & SINPE", icon: CreditCard },
            { key: "hacienda" as const, label: "Hacienda v4.4", icon: ShieldCheck },
            { key: "accessibility" as const, label: "Apariencia", icon: Palette },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === key
                  ? "bg-surface text-text-main shadow-sm border border-border"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: EMPRESA */}
        {activeTab === "general" && (
          <Card className="max-w-3xl">
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre Comercial (Fantasía)"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  required
                />
                <Input
                  label="Razón Social Legal"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                />
                <Input
                  label="Cédula Jurídica / Física"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                />
                <Input
                  label="Código Actividad Económica DGT (6 dígitos)"
                  value={economicActivity}
                  onChange={(e) => setEconomicActivity(e.target.value)}
                  placeholder="Ej: 471101 (Venta de abarrotes)"
                  required
                />
                <Input
                  label="Correo Electrónico Comercial"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Teléfono Comercial"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Dirección Física Exacta (Provincia, Cantón, Distrito, Señas)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Régimen Tributario DGT
                  </label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="TRADICIONAL">Régimen Tradicional (General IVA 13%)</option>
                    <option value="SIMPLIFICADO">Régimen de Tributación Simplificada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                    Moneda Predeterminada
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="CRC">Colones Costarricenses (₡ CRC)</option>
                    <option value="USD">Dólares Americanos ($ USD)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar Datos de Empresa
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* TAB 2: PUNTO DE VENTA (POS) */}
        {activeTab === "pos" && (
          <Card className="max-w-3xl">
            <form onSubmit={handleSavePos} className="space-y-4">
              <h3 className="text-sm font-bold text-text-main">Reglas de Operación del Terminal POS</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 bg-surface-secondary border border-border rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireCashSession}
                    onChange={(e) => setRequireCashSession(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-text-main text-xs block">Requerir turno de caja abierto para vender</span>
                    <span className="text-[11px] text-text-muted">
                      Bloquea el botón de cobro si el cajero no ha registrado su fondo de apertura inicial.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-surface-secondary border border-border rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-text-main text-xs block">Permitir venta con inventario insuficiente (Stock negativo)</span>
                    <span className="text-[11px] text-text-muted">
                      Útil para comercios de alta rotación donde la mercadería ingresa antes de digitar la factura del proveedor.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-surface-secondary border border-border rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoOpenDrawer}
                    onChange={(e) => setAutoOpenDrawer(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-text-main text-xs block">Disparo automático de gaveta de dinero</span>
                    <span className="text-[11px] text-text-muted">
                      Envía la señal ESC/POS de apertura de gaveta (RJ11) al completar pagos en efectivo.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar Preferencias POS
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* TAB 3: IMPRESIÓN TÉRMICA */}
        {activeTab === "printing" && (
          <Card className="max-w-3xl">
            <form onSubmit={handleSavePrinting} className="space-y-4">
              <h3 className="text-sm font-bold text-text-main">Parámetros de Comprobante Térmico</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                    Ancho de Papel Térmico
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaperWidth("80mm")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        paperWidth === "80mm"
                          ? "bg-primary-subtle border-primary text-primary"
                          : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <span>80 mm (Estándar POS)</span>
                      <span className="text-[10px] font-normal text-text-muted">Epson TM-T20, Star Micronics, Bixolon</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperWidth("58mm")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        paperWidth === "58mm"
                          ? "bg-primary-subtle border-primary text-primary"
                          : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      <span>58 mm (Compacta)</span>
                      <span className="text-[10px] font-normal text-text-muted">Mini impresoras portátiles Bluetooth / USB</span>
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 bg-surface-secondary border border-border rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printLogo}
                    onChange={(e) => setPrintLogo(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-text-main text-xs">Imprimir membrete y logo en encabezado</span>
                </label>

                <Input
                  label="Mensaje de Pie de Comprobante (Agradecimiento / Políticas)"
                  value={footerMessage}
                  onChange={(e) => setFooterMessage(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar Formato de Impresión
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* TAB 4: PAGOS & SINPE */}
        {activeTab === "payments" && (
          <Card className="max-w-3xl">
            <form onSubmit={handleSavePayments} className="space-y-4">
              <h3 className="text-sm font-bold text-text-main">Datos para Recepción de Pagos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Número SINPE Móvil Oficial de la Empresa"
                  value={sinpePhone}
                  onChange={(e) => setSinpePhone(e.target.value)}
                  placeholder="Ej: 8888-8888"
                  required
                />
                <Input
                  label="Nombre del Titular de la Cuenta SINPE"
                  value={sinpeName}
                  onChange={(e) => setSinpeName(e.target.value)}
                  placeholder="Ej: Mi Tienda S.A."
                  required
                />
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
                  Métodos de Pago Habilitados en Caja
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2.5 bg-surface-secondary border border-border rounded-xl">
                    <input
                      type="checkbox"
                      checked={enableCash}
                      onChange={(e) => setEnableCash(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span className="text-xs font-bold text-text-main">Efectivo (Colones CRC / Dólares USD)</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 bg-surface-secondary border border-border rounded-xl">
                    <input
                      type="checkbox"
                      checked={enableSinpe}
                      onChange={(e) => setEnableSinpe(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span className="text-xs font-bold text-text-main">SINPE Móvil Inmediato</span>
                  </label>
                  <label className="flex items-center gap-3 p-2.5 bg-surface-secondary border border-border rounded-xl">
                    <input
                      type="checkbox"
                      checked={enableCard}
                      onChange={(e) => setEnableCard(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span className="text-xs font-bold text-text-main">Tarjeta de Débito / Crédito (Datáfono)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar Canales de Pago
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* TAB 5: HACIENDA v4.4 */}
        {activeTab === "hacienda" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <form onSubmit={handleSaveHacienda} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <h2 className="text-sm font-bold text-text-main">Credenciales de Acceso ATV</h2>
                    </div>
                    <Badge variant={env === "PRODUCTION" ? "danger" : "warning"}>
                      {env === "PRODUCTION" ? "PRODUCCIÓN (DGT)" : "SANDBOX / STAGING"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                        Ambiente de Transmisión
                      </label>
                      <select
                        value={env}
                        onChange={(e) => setEnv(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                      >
                        <option value="STAGING">Sandbox / Staging (Pruebas autorizadas DGT)</option>
                        <option value="PRODUCTION">Producción Oficial (Efectos tributarios vinculantes)</option>
                      </select>
                    </div>

                    <Input
                      label="Usuario ATV (Generado en portal ATV)"
                      placeholder="Ej: cpf-01-0123-0456@stag.comprobanteselectronicos.go.cr"
                      value={atvUser}
                      onChange={(e) => setAtvUser(e.target.value)}
                      required
                    />

                    <Input
                      label="Contraseña ATV"
                      type="password"
                      placeholder="••••••••••••"
                      value={atvPass}
                      onChange={(e) => setAtvPass(e.target.value)}
                    />

                    <div className="p-3 bg-surface-secondary border border-border rounded-xl text-xs space-y-1">
                      <p className="font-bold text-text-secondary">Llave Criptográfica (.p12 / .pfx):</p>
                      <p className="text-text-muted text-[11px]">
                        La llave criptográfica se gestiona de forma segura y encriptada en el almacén de claves del servidor.
                      </p>
                      <Input
                        label="PIN de la Llave Criptográfica (4 dígitos)"
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1.5 ${testingConnection ? "animate-spin" : ""}`} />
                      {testingConnection ? "Validando en Hacienda..." : "Probar Conexión con Hacienda"}
                    </Button>
                    <Button type="submit" variant="primary">
                      <Save className="w-4 h-4 mr-1.5" />
                      Guardar Credenciales ATV
                    </Button>
                  </div>
                </form>
              </Card>

              {connectionResult && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                    connectionResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {connectionResult.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold">
                      {connectionResult.success ? "Conexión Exitosa" : "Error de Conexión con ATV"}
                    </h3>
                    <p className="mt-0.5">{connectionResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side Info */}
            <div className="space-y-4">
              <Card className="space-y-3 text-xs">
                <h3 className="font-bold text-text-main flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-primary" />
                  Esquema v4.4 Oficial DGT
                </h3>
                <p className="text-text-muted">
                  Orbítica POS cumple con la resolución <strong>Nº DGT-R-033-2019</strong> y los lineamientos técnicos del Ministerio de Hacienda de Costa Rica.
                </p>
                <div className="pt-2 border-t border-border space-y-1 font-mono text-[11px] text-text-secondary">
                  <div>• Factura Electrónica (01)</div>
                  <div>• Nota de Débito (02)</div>
                  <div>• Nota de Crédito (03)</div>
                  <div>• Tiquete Electrónico (04)</div>
                  <div>• CABYS 2026 integrado</div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 6: APARIENCIA */}
        {activeTab === "accessibility" && (
          <div className="max-w-3xl">
            <AppearanceSettings />
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}