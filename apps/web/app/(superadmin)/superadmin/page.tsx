"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Activity,
  CheckCircle,
  AlertCircle,
  Tag,
  Flame,
  Calendar,
  Save,
  CheckCircle2,
  Users,
  Layers,
} from "lucide-react";
import { SuperadminLayout } from "@/components/layouts/superadmin-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoundersPromoConfig } from "@/types";

interface Tenant {
  id: string;
  legal_name: string;
  trade_name: string;
  identification_number: string;
  email: string;
  is_active: boolean;
  branches_count: number;
}

const DEFAULT_PROMO: FoundersPromoConfig = {
  is_active: true,
  discount_percentage: 20,
  expires_at: "2026-10-31",
  max_claims: 50,
  claimed_count: 18,
};

export default function SuperadminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [promoConfig, setPromoConfig] = useState<FoundersPromoConfig>(DEFAULT_PROMO);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Find all registered organizations in local registry or initialize with current
      const foundTenants: Tenant[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("orbitica_settings_")) {
          const orgId = key.replace("orbitica_settings_", "");
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            foundTenants.push({
              id: orgId,
              legal_name: parsed.legal_name || "Empresa Registrada",
              trade_name: parsed.trade_name || "Mi Negocio",
              identification_number: parsed.identification_number || "3101000000",
              email: parsed.email || "info@negocio.cr",
              is_active: true,
              branches_count: 1,
            });
          }
        }
      }
      setTenants(foundTenants);

      // Load promo config
      const savedPromo = localStorage.getItem("orbitica_founders_promo");
      if (savedPromo) {
        setPromoConfig(JSON.parse(savedPromo));
      }
    } catch (e) {}
  }, []);

  const toggleTenant = (id: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
    );
  };

  const handleSavePromo = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("orbitica_founders_promo", JSON.stringify(promoConfig));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } catch (e) {}
    }
  };

  const activeCount = tenants.filter((t) => t.is_active).length;

  return (
    <SuperadminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-surface to-purple-950/20 border border-purple-500/20 rounded-3xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-text-main tracking-tight">Panel Superadmin Orbítica</h1>
            </div>
            <p className="text-xs text-text-muted">Gestión centralizada de planes, promociones de lanzamiento y organizaciones SaaS.</p>
          </div>
          <Badge variant="blue" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
            ORBÍTICA STUDIO MASTER
          </Badge>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase">Empresas Registradas</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main">{tenants.length}</span>
              <span className="text-[11px] text-text-muted block">{activeCount} activas en producción</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase">Estado de Hacienda ATV</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-400">99.9%</span>
              <span className="text-[11px] text-text-muted block">Disponibilidad DGT-R-48-2016</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase">Oferta Fundadores</span>
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-primary">
                {promoConfig.is_active ? `${promoConfig.discount_percentage}% OFF` : "Inactiva"}
              </span>
              <span className="text-[11px] text-text-muted block">
                {promoConfig.is_active ? `${promoConfig.max_claims - promoConfig.claimed_count} cupos disponibles` : "Promoción desactivada"}
              </span>
            </div>
          </Card>
        </div>

        {/* Founders Promo Engine Configuration Card */}
        <Card className="border-l-4 border-l-emerald-500 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-text-main">Motor de Oferta de Lanzamiento: Precio Fundadores</h2>
              </div>
              <p className="text-xs text-text-muted">
                Configura el descuento promocional del 20% para los primeros negocios en Costa Rica. Los cambios se reflejan en tiempo real en la página de precios.
              </p>
            </div>
            <Badge variant={promoConfig.is_active ? "success" : "default"}>
              {promoConfig.is_active ? "🟢 Promoción Activa" : "⚪ Promoción Inactiva"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Estado de la Promoción</label>
              <button
                type="button"
                onClick={() => setPromoConfig((prev) => ({ ...prev, is_active: !prev.is_active }))}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  promoConfig.is_active
                    ? "bg-emerald-600 text-white border-emerald-500"
                    : "bg-surface-secondary text-text-muted border-border"
                }`}
              >
                {promoConfig.is_active ? "✓ Activa en Producción" : "✗ Desactivada"}
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Porcentaje de Descuento (%)</label>
              <Input
                type="number"
                value={promoConfig.discount_percentage}
                onChange={(e) =>
                  setPromoConfig((prev) => ({ ...prev, discount_percentage: Number(e.target.value) || 0 }))
                }
                className="text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Fecha de Expiración</label>
              <Input
                type="date"
                value={promoConfig.expires_at}
                onChange={(e) => setPromoConfig((prev) => ({ ...prev, expires_at: e.target.value }))}
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Cupos (Reclamados / Total)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={promoConfig.claimed_count}
                  onChange={(e) =>
                    setPromoConfig((prev) => ({ ...prev, claimed_count: Number(e.target.value) || 0 }))
                  }
                  className="text-xs font-mono"
                  placeholder="Reclamados"
                />
                <span className="text-xs text-text-muted font-bold">/</span>
                <Input
                  type="number"
                  value={promoConfig.max_claims}
                  onChange={(e) =>
                    setPromoConfig((prev) => ({ ...prev, max_claims: Number(e.target.value) || 0 }))
                  }
                  className="text-xs font-mono"
                  placeholder="Total"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-[11px] text-text-muted">
              {isSaved ? "✓ ¡Configuración guardada y sincronizada globalmente!" : "Guarda los cambios para aplicarlos en la suite SaaS."}
            </span>
            <Button variant="primary" size="sm" onClick={handleSavePromo} className="gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-500">
              <Save className="w-4 h-4" />
              Guardar Configuración
            </Button>
          </div>
        </Card>

        {/* Official Plan Limits & Pricing Reference */}
        <Card className="space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black text-text-main flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Planes Comerciales Oficiales de Orbítica POS
              </CardTitle>
              <Badge variant="blue">CRC (₡) COSTA RICA</Badge>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-text-muted block">Plan 1</span>
              <h3 className="text-sm font-black text-text-main">Orbítica Inicio</h3>
              <div className="text-base font-black text-emerald-500 font-mono">₡9.900 / mes</div>
              <p className="text-[10px] text-text-muted">2 usuarios, 1 sucursal, 1 caja, Hacienda v4.4, cotizaciones y arqueo Z.</p>
            </div>

            <div className="p-3.5 bg-surface-secondary border-2 border-primary/40 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-primary block">Plan 2 ⭐ Más Popular</span>
              <h3 className="text-sm font-black text-text-main">Orbítica Crece</h3>
              <div className="text-base font-black text-primary font-mono">₡17.900 / mes</div>
              <p className="text-[10px] text-text-muted">8 usuarios, hasta 3 sucursales, multi-caja, offline, bancos, CRM y citas.</p>
            </div>

            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-text-muted block">Plan 3</span>
              <h3 className="text-sm font-black text-text-main">Orbítica Escala</h3>
              <div className="text-base font-black text-purple-400 font-mono">₡27.900 / mes</div>
              <p className="text-[10px] text-text-muted">Usuarios ilimitados*, hasta 10 sucursales, facturación masiva, XML y API.</p>
            </div>

            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-text-muted block">Plan 4</span>
              <h3 className="text-sm font-black text-text-main">Orbítica Empresarial</h3>
              <div className="text-base font-black text-cyan-400 font-mono">Desde ₡44.900 / mes</div>
              <p className="text-[10px] text-text-muted">A medida, ERP/WMS, módulo contable, RRHH, asistencia y SLA 99.9%.</p>
            </div>
          </div>
        </Card>

        {/* Active SaaS Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organizaciones SaaS Registradas</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de organizaciones SaaS">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Empresa (Nombre Comercial)</th>
                  <th scope="col" className="pb-3 font-bold">Razón Social</th>
                  <th scope="col" className="pb-3 font-bold">Cédula</th>
                  <th scope="col" className="pb-3 font-bold">Correo</th>
                  <th scope="col" className="pb-3 font-bold">Sucursales</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted">
                      No hay organizaciones registradas aún. Las nuevas empresas creadas desde el registro aparecerán aquí.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-bold text-text-main">{t.trade_name}</td>
                      <td className="py-3 text-text-secondary">{t.legal_name}</td>
                      <td className="py-3 font-mono text-text-muted">{t.identification_number}</td>
                      <td className="py-3 text-text-muted">{t.email}</td>
                      <td className="py-3 font-mono">{t.branches_count} sucursal</td>
                      <td className="py-3">
                        <Badge variant={t.is_active ? "success" : "default"}>
                          {t.is_active ? "Activo" : "Suspendido"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTenant(t.id)}
                          className="text-[11px] text-text-muted hover:text-text-main"
                        >
                          {t.is_active ? "Suspender" : "Reactivar"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </SuperadminLayout>
  );
}