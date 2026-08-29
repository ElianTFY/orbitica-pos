"use client";

import React, { useState } from "react";
import { Settings as SettingsIcon, Save, Building2, ShieldCheck } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Configuración del Negocio</h1>
          <p className="text-xs text-[#8E929E]">Parámetros fiscales de Costa Rica, moneda base y datos comerciales</p>
        </div>

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
              {saved && <span className="text-xs text-emerald-400 font-semibold">¡Cambios guardados con éxito!</span>}
              <div className="ml-auto">
                <Button type="submit" variant="primary">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Parámetros
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </OwnerLayout>
  );
}
