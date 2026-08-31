"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Building2, MapPin, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { SuperadminLayout } from "@/components/layouts/superadmin-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Tenant {
  id: string;
  legal_name: string;
  trade_name: string;
  identification_number: string;
  email: string;
  is_active: boolean;
  branches_count: number;
}

export default function SuperadminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

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
    } catch (e) {}
  }, []);

  const toggleTenant = (id: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
    );
  };

  const activeCount = tenants.filter((t) => t.is_active).length;

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-surface to-purple-950/20 border border-purple-500/20 rounded-3xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-text-main tracking-tight">Panel Superadmin Orbítica</h1>
            </div>
            <p className="text-xs text-text-muted">Gestión centralizada de organizaciones SaaS, métricas y estado del sistema.</p>
          </div>
          <Badge variant="blue" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
            ORBÍTICA STUDIO CONTROL
          </Badge>
        </div>

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
              <span className="text-xs text-text-muted font-bold uppercase">Firmador XAdES-BES</span>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-primary">Operativo</span>
              <span className="text-[11px] text-text-muted block">SHA-256 + XML Canonicalization</span>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organizaciones SaaS Activas</CardTitle>
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