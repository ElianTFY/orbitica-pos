"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

type FiscalCredentialsStatus = {
  environment: string; atv_username: string; has_certificate: boolean; is_active: boolean;
  status_message: string; certificate_expires_at: string | null;
  connection_tested_at: string | null; connection_test_success: boolean | null;
};
type FiscalReadiness = {
  ready: boolean; environment: string;
  checks: Array<{ code: string; ok: boolean; message: string }>;
  queue: { pending: number; attention: number; email_pending: number };
  worker: { active: boolean; last_seen_at: string | null };
  sandbox_documents: Array<{ doc_type: string; name: string; accepted: boolean }>;
};
const fiscalDate = (value: string) => new Date(value).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" });

export default function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"general" | "hacienda" | "accessibility">("general");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for general
  const [tradeName, setTradeName] = useState(settings.trade_name);
  const [legalName, setLegalName] = useState(settings.legal_name);
  const [idNumber, setIdNumber] = useState(settings.identification_number);
  const [identificationType, setIdentificationType] = useState(settings.identification_type);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [taxRegime, setTaxRegime] = useState(settings.tax_regime);
  const [currency, setCurrency] = useState(settings.default_currency);
  const [economicActivity, setEconomicActivity] = useState(settings.economic_activity_code);
  const [provinceCode, setProvinceCode] = useState(settings.province_code);
  const [cantonCode, setCantonCode] = useState(settings.canton_code);
  const [districtCode, setDistrictCode] = useState(settings.district_code);
  const [neighborhoodCode, setNeighborhoodCode] = useState(settings.neighborhood_code);

  // Form states for Hacienda
  const [env, setEnv] = useState(settings.atv_environment);
  const [atvUser, setAtvUser] = useState(settings.atv_username);
  const [atvPass, setAtvPass] = useState("");
  const [pin, setPin] = useState("");
  const [p12File, setP12File] = useState<File | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<FiscalCredentialsStatus | null>(null);
  const [readiness, setReadiness] = useState<FiscalReadiness | null>(null);
  const [fiscalStatusError, setFiscalStatusError] = useState<string | null>(null);
  const [loadingFiscalStatus, setLoadingFiscalStatus] = useState(false);
  const fiscalStatusRequest = useRef(0);
  const certificateInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTradeName(settings.trade_name);
    setLegalName(settings.legal_name);
    setIdNumber(settings.identification_number);
    setIdentificationType(settings.identification_type);
    setEmail(settings.email);
    setPhone(settings.phone);
    setAddress(settings.address);
    setEconomicActivity(settings.economic_activity_code);
    setProvinceCode(settings.province_code);
    setCantonCode(settings.canton_code);
    setDistrictCode(settings.district_code);
    setNeighborhoodCode(settings.neighborhood_code);
    setEnv(settings.atv_environment);
    setAtvUser(settings.atv_username);
  }, [settings]);

  const refreshFiscalStatus = useCallback(async (loadUsername = false) => {
    if (!user?.id) return;
    const requestId = ++fiscalStatusRequest.current;
    setLoadingFiscalStatus(true);
    try {
      const [credentialsResponse, readinessResponse] = await Promise.all([
        api.request<FiscalCredentialsStatus>(`/hacienda/credentials?environment=${env}`),
        api.request<FiscalReadiness>(`/hacienda/readiness?environment=${env}`),
      ]);
      if (requestId !== fiscalStatusRequest.current) return;
      setCredentialStatus(credentialsResponse.data);
      setReadiness(readinessResponse.data);
      setFiscalStatusError(null);
      if (loadUsername) setAtvUser(credentialsResponse.data.atv_username || "");
    } catch {
      if (requestId !== fiscalStatusRequest.current) return;
      setCredentialStatus(null);
      setReadiness(null);
      setFiscalStatusError("No se pudo consultar la configuración fiscal. Pulsa Actualizar estado para intentar nuevamente.");
    } finally {
      if (requestId === fiscalStatusRequest.current) setLoadingFiscalStatus(false);
    }
  }, [env, user?.id]);

  useEffect(() => {
    setCredentialStatus(null);
    setReadiness(null);
    setAtvUser("");
    setAtvPass("");
    setPin("");
    setP12File(null);
    setSaveError(null);
    if (certificateInput.current) certificateInput.current.value = "";
    void refreshFiscalStatus(true);
    return () => { fiscalStatusRequest.current += 1; };
  }, [refreshFiscalStatus]);

  useEffect(() => {
    if (activeTab !== "hacienda") return;
    const interval = setInterval(() => { void refreshFiscalStatus(); }, 30_000);
    return () => clearInterval(interval);
  }, [activeTab, refreshFiscalStatus]);

  // Clear connection result whenever the user changes ATV credentials
  useEffect(() => {
    setConnectionResult(null);
  }, [atvUser, atvPass, env]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        trade_name: tradeName,
        legal_name: legalName,
        identification_type: identificationType,
        identification_number: idNumber,
        email,
        phone,
        address,
        economic_activity_code: economicActivity,
        province_code: provinceCode,
        canton_code: cantonCode,
        district_code: districtCode,
        neighborhood_code: neighborhoodCode,
        tax_regime: taxRegime,
        default_currency: currency,
      });
      await refreshFiscalStatus();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error: any) {
      setSaveError(error?.message || "No fue posible guardar los datos fiscales.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHacienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atvUser.trim() || (!atvPass && !credentialStatus?.is_active) || (pin ? !/^\d{4}$/.test(pin) : !credentialStatus?.has_certificate || !!p12File)) {
      setSaveError("Ingresa el usuario, la contraseña API y el PIN de 4 dígitos. Si ya están guardados, deja las claves vacías para conservarlas; un certificado nuevo siempre requiere su PIN.");
      return;
    }
    if (!p12File && !credentialStatus?.has_certificate) {
      setSaveError("Selecciona la llave criptográfica .p12/.pfx antes de guardar.");
      return;
    }
    if (p12File && p12File.size > 1_500_000) {
      setSaveError("El certificado supera el tamaño máximo de 1.5 MB.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      let p12Base64: string | undefined;
      if (p12File) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("No fue posible leer el certificado."));
          reader.readAsDataURL(p12File);
        });
        p12Base64 = dataUrl.split(",", 2)[1];
      }
      await api.request("/hacienda/credentials", {
        method: "POST",
        body: JSON.stringify({
          environment: env,
          atv_username: atvUser.trim(),
          atv_password: atvPass || undefined,
          pin: pin || undefined,
          p12_base64: p12Base64,
        }),
      });
      await updateSettings({ atv_environment: env, atv_username: atvUser.trim() });
      await refreshFiscalStatus();
      setP12File(null);
      if (certificateInput.current) certificateInput.current.value = "";
      setAtvPass("");
      setPin("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error: any) {
      setSaveError(error?.message || "No fue posible guardar las credenciales fiscales.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!atvPass && (!credentialStatus?.is_active || atvUser.trim() !== credentialStatus.atv_username)) {
      setConnectionResult({ success: false, message: "Guarda primero las credenciales de este ambiente o ingresa usuario y contraseña para probar los datos nuevos." });
      return;
    }
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await api.request<{ success: boolean; message: string }>("/hacienda/test-connection", {
        method: "POST",
        timeoutMs: 30_000,
        body: JSON.stringify({
          environment: env,
          ...(atvPass ? { atv_username: atvUser.trim(), atv_password: atvPass } : {}),
        }),
      });
      setConnectionResult({
        success: res.data.success,
        message: res.data.message,
      });
      await refreshFiscalStatus();
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: err.message || "Error al conectar con los servidores de Hacienda",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Configuración del Negocio</h1>
          <p className="text-xs text-text-muted">
            Administra los datos comerciales de tu empresa ({settings.trade_name}), llaves tributarias de Hacienda y apariencia
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Pestañas de configuración"
          className="flex flex-wrap bg-surface-secondary p-1 rounded-2xl border border-border max-w-xl gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "general"
                ? "bg-surface text-text-main shadow-sm border border-border"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Building className="w-4 h-4" />
            Datos Comerciales
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "hacienda"}
            onClick={() => setActiveTab("hacienda")}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "hacienda"
                ? "bg-surface text-text-main shadow-sm border border-border"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Hacienda v4.4
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "accessibility"}
            onClick={() => setActiveTab("accessibility")}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "accessibility"
                ? "bg-surface text-text-main shadow-sm border border-border"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Palette className="w-4 h-4 text-primary" />
            Apariencia y Accesibilidad
          </button>
        </div>

        {activeTab === "accessibility" && (
          <div className="max-w-3xl">
            <AppearanceSettings />
          </div>
        )}

        {activeTab === "general" && (
          <Card className="max-w-2xl">
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
                  helperText="Identificador tributario para Hacienda"
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Tipo de identificación</label>
                  <select value={identificationType} onChange={(e) => setIdentificationType(e.target.value as typeof identificationType)} className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary">
                    <option value="01">Cédula física</option>
                    <option value="02">Cédula jurídica</option>
                    <option value="03">DIMEX</option>
                    <option value="04">NITE</option>
                    <option value="05">Extranjero</option>
                  </select>
                </div>
                <Input
                  label="Correo de Facturación"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Teléfono Comercial"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Dirección Física"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <Input label="Actividad económica" value={economicActivity} onChange={(e) => setEconomicActivity(e.target.value.replace(/\D/g, "").slice(0, 6))} helperText="Código de 6 dígitos registrado en Hacienda" required />
                <Input label="Provincia (1–7)" value={provinceCode} onChange={(e) => setProvinceCode(e.target.value.replace(/\D/g, "").slice(0, 1))} required />
                <Input label="Cantón (2 dígitos)" value={cantonCode} onChange={(e) => setCantonCode(e.target.value.replace(/\D/g, "").slice(0, 2))} required />
                <Input label="Distrito (2 dígitos)" value={districtCode} onChange={(e) => setDistrictCode(e.target.value.replace(/\D/g, "").slice(0, 2))} required />
                <Input label="Barrio (opcional)" value={neighborhoodCode} onChange={(e) => setNeighborhoodCode(e.target.value.replace(/\D/g, "").slice(0, 2))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Régimen Tributario (Ministerio de Hacienda)
                </label>
                <select
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="TRADICIONAL">Régimen Tradicional (Factura Electrónica Obligatoria)</option>
                  <option value="SIMPLIFICADO">Régimen de Tributación Simplificada</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Moneda Base del Sistema
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="CRC">Colones Costarricenses (CRC - ₡)</option>
                  <option value="USD" disabled>USD — requiere integración de tipo de cambio</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                {saveError && <span role="alert" className="text-xs text-semantic-danger-text font-bold">{saveError}</span>}
                {saved && (
                  <span className="text-xs text-semantic-success-text font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Datos comerciales actualizados exitosamente
                  </span>
                )}
                <div className="ml-auto">
                  <Button type="submit" variant="primary" disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Guardando…" : "Guardar Datos Comerciales"}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        {activeTab === "hacienda" && (
          <Card className="max-w-2xl space-y-6">
            <div className="flex flex-wrap gap-3 items-center justify-between p-3.5 bg-surface-secondary rounded-2xl border border-border">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-5 h-5 ${atvUser ? "text-emerald-500" : "text-text-muted"}`} />
                <div>
                  <span className="text-xs font-bold text-text-main block">Conexión fiscal de esta empresa</span>
                  <span className="text-[10px] text-text-muted">Comprobantes electrónicos de Costa Rica v4.4</span>
                </div>
              </div>
              <Badge variant={credentialStatus?.is_active ? "success" : "default"}>
                {credentialStatus?.is_active ? "CREDENCIALES REGISTRADAS" : "CREDENCIALES PENDIENTES"}
              </Badge>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              El correo y la contraseña de Orbítica identifican a cada usuario. Aquí el dueño configura el usuario API, la contraseña API y la llave de Hacienda de su empresa. Las claves de pruebas y producción se guardan por separado.
            </p>
            <form onSubmit={handleSaveHacienda} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Ambiente de Envío de Hacienda
                </label>
                <select
                  value={env}
                  aria-label="Ambiente de Hacienda"
                  disabled={saving || testingConnection}
                  onChange={(e) => setEnv(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="STAGING">Pruebas (sin validez tributaria)</option>
                  <option value="PRODUCTION">Producción</option>
                </select>
                <p className="text-xs text-text-muted">Ambiente activo del negocio: {settings.atv_environment === "STAGING" ? "Pruebas" : "Producción"}. {env !== settings.atv_environment && "El cambio se aplicará al guardar las credenciales."}</p>
              </div>

              <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-text-main">Llave Criptográfica (.p12 / .pfx)</span>
                  </div>
                  <span className="text-[10px] text-text-muted">Llave emitida por Hacienda</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-text-muted block mb-1">Archivo de Certificado (.p12 / .pfx)</label>
                    <input
                      type="file"
                      ref={certificateInput}
                      disabled={saving || loadingFiscalStatus}
                      accept=".p12,.pfx"
                      aria-label="Archivo de certificado llave criptográfica"
                      onChange={(e) => setP12File(e.target.files?.[0] || null)}
                      className="w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-surface file:text-text-main hover:file:bg-surface-hover cursor-pointer border border-border rounded-xl p-1"
                    />
                  </div>
                  <Input
                    label="PIN de Llave Criptográfica (4 dígitos)"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-text-main">Credenciales API de comprobantes electrónicos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Usuario API de Hacienda"
                    value={atvUser}
                    onChange={(e) => setAtvUser(e.target.value)}
                  />
                  <Input
                    label="Contraseña API de Hacienda"
                    type="password"
                    value={atvPass}
                    onChange={(e) => setAtvPass(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-text-muted">Usa la contraseña de la API de comprobantes, no la contraseña de acceso al portal tributario. Si las claves ya están guardadas, deja contraseña y PIN vacíos para conservarlos.</p>
              {credentialStatus && <div className="text-xs text-text-secondary space-y-1">
                <p>{credentialStatus.status_message}</p>
                {credentialStatus.certificate_expires_at && <p>Vencimiento del certificado: {fiscalDate(credentialStatus.certificate_expires_at)}</p>}
                {credentialStatus.connection_tested_at && <p>Última prueba de las claves guardadas: {credentialStatus.connection_test_success ? "exitosa" : "fallida"} · {fiscalDate(credentialStatus.connection_tested_at)}</p>}
              </div>}
              <Button type="button" variant="secondary" disabled={loadingFiscalStatus} onClick={() => { void refreshFiscalStatus(); }}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingFiscalStatus ? "animate-spin" : ""}`} />
                {loadingFiscalStatus ? "Consultando estado…" : "Actualizar estado"}
              </Button>
              {fiscalStatusError && <p role="alert" className="text-xs text-semantic-danger-text">{fiscalStatusError}</p>}

              {connectionResult && (
                <div
                  role="alert"
                  className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
                    connectionResult.success
                      ? "bg-semantic-success-bg border-semantic-success-border text-semantic-success-text"
                      : "bg-semantic-danger-bg border-semantic-danger-border text-semantic-danger-text"
                  }`}
                >
                  {connectionResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{connectionResult.message}</span>
                </div>
              )}

              {readiness && (
                <div className="rounded-2xl border border-border bg-surface-secondary p-4 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-xs font-bold text-text-main">Preparación para {readiness.environment === "STAGING" ? "enviar pruebas" : "emitir en producción"}</span>
                    <Badge variant={readiness.ready ? "success" : "warning"}>{readiness.ready ? "CONFIGURACIÓN COMPLETA" : "PENDIENTES"}</Badge>
                  </div>
                  {readiness.checks.map((check) => (
                    <div key={check.code} className="flex items-center gap-2 text-xs">
                      {check.ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                      <span className={check.ok ? "text-text-secondary" : "text-amber-500"}>{check.message}</span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-text-secondary">En cola: {readiness.queue.pending} · Requieren revisión: {readiness.queue.attention} · Correos pendientes: {readiness.queue.email_pending}</p>
                  {readiness.worker.last_seen_at && <p className="text-xs text-text-muted">Última actividad del servicio de envío: {fiscalDate(readiness.worker.last_seen_at)}</p>}
                  <div className="border-t border-border pt-2 space-y-1">
                    <p className="text-xs font-bold text-text-main">Comprobantes aceptados en pruebas de esta empresa</p>
                    {readiness.sandbox_documents.map((doc) => <p key={doc.doc_type} className="text-xs text-text-secondary">{doc.name}: {doc.accepted ? "aceptado" : "pendiente"}</p>)}
                  </div>
                  <p className="text-xs text-text-muted">La autenticación y la configuración no garantizan aceptación fiscal. Cada comprobante debe recibir su respuesta de Hacienda. Consulta los XML y los rechazos en Facturación.</p>
                </div>
              )}

              {saveError && <div role="alert" className="p-3 rounded-xl border border-semantic-danger-border bg-semantic-danger-bg text-xs text-semantic-danger-text">{saveError}</div>}

              <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testingConnection || saving || loadingFiscalStatus || (!credentialStatus?.is_active && (!atvUser.trim() || !atvPass))}
                >
                  {testingConnection ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-primary" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
                  )}
                  {testingConnection ? "Probando conexión…" : atvPass ? "Probar datos ingresados" : "Probar credenciales guardadas"}
                </Button>

                <div className="ml-auto">
                  <Button type="submit" variant="primary" disabled={saving || testingConnection || loadingFiscalStatus}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Guardando…" : "Guardar Credenciales"}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
