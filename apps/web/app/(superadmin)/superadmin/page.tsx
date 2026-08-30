"use client";

import React, { useState } from "react";
import { ShieldCheck, Building2, MapPin, Activity } from "lucide-react";
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

const DEMO_TENANTS: Tenant[] = [
  { id: "1", legal_name: "Comercial San José S.A.", trade_name: "Minimarket San José Express", identification_number: "3101888999", email: "contacto@sanjoseexpress.cr", is_active: true, branches_count: 2 },
  { id: "2", legal_name: "Licores del Valle Limitada", trade_name: "Licorería El Valle", identification_number: "3101444555", email: "valle@licores.cr", is_active: true, branches_count: 1 },
  { id: "3", legal_name: "Barbería Estilo Urbano S.A.", trade_name: "Urbano Barber Studio", identification_number: "3101777222", email: "urbano@barber.cr", is_active: false, branches_count: 1 },
];

export default function SuperadminPage() {
  const [tenants, setTenants] = useState<Tenant[]>(DEMO_TENANTS);

  const toggleTenant = (id: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
    );
  };

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#141518] to-purple-950/20 border border-purple-500/20 rounded-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Panel Superadmin Orbítica</h1>
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
              <span className="text-xs text-text-muted font-medium uppercase">Empresas Activas</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">2 / 3</span>
              <span className="text-[11px] text-text-muted block">Tenants registrados</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Sucursales Operativas</span>
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">4</span>
              <span className="text-[11px] text-text-muted block">Puntos de venta en red</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Salud del API</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-400">99.98%</span>
              <span className="text-[11px] text-text-muted block">Latencia media: 42ms</span>
            </div>
          </Card>
        </div>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Empresas Suscritas (Tenants)</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="pb-3">Nombre Comercial</th>
                  <th className="pb-3">Razón Social</th>
                  <th className="pb-3">Cédula / Identificación</th>
                  <th className="pb-3">Correo Contacto</th>
                  <th className="pb-3">Sucursales</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="py-3 font-semibold text-white">{t.trade_name}</td>
                    <td className="py-3 text-text-secondary">{t.legal_name}</td>
                    <td className="py-3 font-mono text-text-muted">{t.identification_number}</td>
                    <td className="py-3 text-text-secondary">{t.email}</td>
                    <td className="py-3 font-bold text-white">{t.branches_count}</td>
                    <td className="py-3">
                      {t.is_active ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="danger">Suspendida</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant={t.is_active ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => toggleTenant(t.id)}
                      >
                        {t.is_active ? "Suspender" : "Reactivar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </SuperadminLayout>
  );
}
