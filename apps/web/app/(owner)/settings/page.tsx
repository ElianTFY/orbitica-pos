"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
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
import { api } from "@/lib/api-client";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "hacienda" | "accessibility">("general");
  const [saved, setSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for Hacienda
  const [env, setEnv] = useState("STAGING");
  const [atvUser, setAtvUser] = useState("cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr");
  const [atvPass, setAtvPass] = useState("SuperPasswordHacienda123!");
  const [pin, setPin] = useState("1234");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await api.request<{ success: boolean; message: string }>("/hacienda/test-connection", {
        method: "POST",
        body: JSON.stringify({
          environment: env,
          atv_username: atvUser,
          atv_password: atvPass,
          pin: pin,
        }),
      });
      setConnectionResult({
        success: res.data.success,
        message: res.data.message,
      });
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
          <h1 className="text-xl font-bold text-text-main tracking-tight">Configuración del Sistema</h1>
          <p className="text-xs text-text-muted">
            Parámetros tributarios de Costa Rica, llaves criptográficas y preferencias de accesibilidad
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
            Hacienda v4.3
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
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre Comercial" defaultValue="Minimarket San José Express" />
                <Input label="Razón Social" defaultValue="Comercial San José S.A." />
                <Input label="Cédula Jurídica / Física" defaultValue="3101888999" disabled helperText="Inmutable por seguridad tributaria" />
                <Input label="Correo de Facturación" defaultValue="facturacion@sanjoseexpress.cr" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Régimen Tributario (Ministerio de Hacienda)
                </label>
                <select className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="TRADICIONAL">Régimen Tradicional (Factura Electrónica Obligatoria)</option>
                  <option value="SIMPLIFICADO">Régimen de Tributación Simplificada</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Moneda Base del Sistema
                </label>
                <select className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="CRC">Colones Costarricenses (CRC - ₡)</option>
                  <option value="USD">Dólares Americanos (USD - $)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                {saved && (
                  <span className="text-xs text-semantic-success-text font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Parámetros guardados exitosamente
                  </span>
                )}
                <div className="ml-auto">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Parámetros
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        {activeTab === "hacienda" && (
          <Card className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-text-main block">Firmador Digital XAdES-BES & API ATV</span>
                  <span className="text-[10px] text-text-muted">Firma criptográfica SHA-256 + Token OAuth2 de Hacienda</span>
                </div>
              </div>
              <Badge variant="success">FIRMADO XAdES-BES ACTIVO</Badge>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Ambiente de Envío de Hacienda
                </label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="STAGING">Sandbox / Pruebas (api-sandbox.comprobanteselectronicos.go.cr)</option>
                  <option value="PRODUCTION">Producción Oficial (api.comprobanteselectronicos.go.cr)</option>
                </select>
              </div>

              <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text-main">Llave Criptográfica (.p12 / .pfx)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-text-muted block mb-1">Archivo de Certificado</label>
                    <input
                      type="file"
                      accept=".p12,.pfx"
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
                  <span className="text-xs font-bold text-text-main">Credenciales API ATV (Ministerio de Hacienda)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Usuario ATV (cpf-...)"
                    value={atvUser}
                    onChange={(e) => setAtvUser(e.target.value)}
                  />
                  <Input
                    label="Contraseña API ATV"
                    type="password"
                    value={atvPass}
                    onChange={(e) => setAtvPass(e.target.value)}
                  />
                </div>
              </div>

              {connectionResult && (
                <div
                  role="alert"
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                    connectionResult.success
                      ? "bg-semantic-success-bg border-semantic-success-border text-semantic-success-text"
                      : "bg-semantic-danger-bg border-semantic-danger-border text-semantic-danger-text"
                  }`}
                >
                  {connectionResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{connectionResult.message}</span>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-primary" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
                  )}
                  {testingConnection ? "Probando Conexión..." : "Validar Conexión con Hacienda"}
                </Button>

                <div className="ml-auto">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Credenciales
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