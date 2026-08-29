"use client";

import React, { useState } from "react";
import { Settings as SettingsIcon, Save, ShieldCheck, KeyRound, FileCode, CheckCircle } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "hacienda">("general");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Configuración del Sistema</h1>
          <p className="text-xs text-[#8E929E]">Parámetros tributarios de Costa Rica, llaves criptográficas y datos comerciales</p>
        </div>

        <div className="flex bg-[#141518] p-1 rounded-xl border border-[#26282E] max-w-md">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "general" ? "bg-[#0EA5FF] text-white" : "text-[#8E929E] hover:text-white"
            }`}
          >
            Datos Comerciales
          </button>
          <button
            onClick={() => setActiveTab("hacienda")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "hacienda" ? "bg-[#0EA5FF] text-white" : "text-[#8E929E] hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Hacienda v4.3 (Llaves y ATV)
          </button>
        </div>

        {activeTab === "general" ? (
          <Card className="max-w-2xl">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre Comercial" defaultValue="Minimarket San José Express" />
                <Input label="Razón Social" defaultValue="Comercial San José S.A." />
                <Input label="Cédula Jurídica / Física" defaultValue="3101888999" disabled />
                <Input label="Correo de Facturación" defaultValue="facturacion@sanjoseexpress.cr" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#CFCFD4]">Régimen Tributario (Ministerio de Hacienda)</label>
                <select className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]">
                  <option value="TRADICIONAL">Régimen Tradicional (Factura Electrónica Obligatoria)</option>
                  <option value="SIMPLIFICADO">Régimen de Tributación Simplificada</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#CFCFD4]">Moneda Base del Sistema</label>
                <select className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]">
                  <option value="CRC">Colones Costarricenses (CRC - ₡)</option>
                  <option value="USD">Dólares Americanos (USD - $)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#26282E] flex items-center justify-between">
                {saved && <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Parámetros guardados exitosamente</span>}
                <div className="ml-auto">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Parámetros
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between p-3 bg-[#1A1B1F] rounded-xl border border-[#26282E]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Estado de Conexión con Hacienda</span>
                  <span className="text-[10px] text-[#8E929E]">Firma digital XAdES-BES & API ATV</span>
                </div>
              </div>
              <Badge variant="success">CERTIFICADO ACTIVO</Badge>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#CFCFD4]">Ambiente de Envío de Hacienda</label>
                <select className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]">
                  <option value="STAGING">Sandbox / Pruebas (api-sandbox.comprobanteselectronicos.go.cr)</option>
                  <option value="PRODUCTION">Producción Oficial (api.comprobanteselectronicos.go.cr)</option>
                </select>
              </div>

              <div className="p-4 bg-[#141518] rounded-xl border border-[#26282E] space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#0EA5FF]" />
                  <span className="text-xs font-bold text-white">Llave Criptográfica (.p12 / .pfx)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#8E929E] block mb-1">Archivo de Certificado</label>
                    <input
                      type="file"
                      accept=".p12,.pfx"
                      className="w-full text-xs text-[#8E929E] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A1B1F] file:text-white hover:file:bg-[#26282E] cursor-pointer"
                    />
                  </div>
                  <Input label="PIN de Llave Criptográfica (4 dígitos)" type="password" defaultValue="1234" maxLength={4} />
                </div>
              </div>

              <div className="p-4 bg-[#141518] rounded-xl border border-[#26282E] space-y-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">Credenciales API ATV (Ministerio de Hacienda)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Usuario ATV (cpf-...)" defaultValue="cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr" />
                  <Input label="Contraseña API ATV" type="password" defaultValue="SuperPasswordHacienda123!" />
                </div>
              </div>

              <div className="pt-3 border-t border-[#26282E] flex items-center justify-between">
                {saved && <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Credenciales guardadas y verificadas</span>}
                <div className="ml-auto">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Credenciales de Hacienda
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