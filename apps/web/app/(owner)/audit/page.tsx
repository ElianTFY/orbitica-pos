"use client";

import React, { useState } from "react";
import { ShieldCheck, Search, Filter } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";

export default function AuditPage() {
  const { auditLogs, settings } = useStore();
  const [search, setSearch] = useState("");

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Registro de Auditoría de Seguridad</h1>
          <p className="text-xs text-text-muted">
            {settings.trade_name} — Trazabilidad inmutable de todas las acciones y eventos en el sistema
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Filtrar por acción o usuario"
            placeholder="Filtrar por acción, usuario o recurso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de auditoría de seguridad">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Fecha / Hora</th>
                  <th scope="col" className="pb-3 font-bold">Usuario / Responsable</th>
                  <th scope="col" className="pb-3 font-bold">Acción Realizada</th>
                  <th scope="col" className="pb-3 font-bold">Recurso Afectado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Dirección IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 font-mono text-text-muted text-[11px]">{l.created_at}</td>
                    <td className="py-3 font-bold text-text-main">{l.actor_name}</td>
                    <td className="py-3">
                      <Badge variant="blue">{l.action}</Badge>
                    </td>
                    <td className="py-3 font-mono text-text-secondary text-[11px]">{l.resource}</td>
                    <td className="py-3 text-right font-mono text-text-muted text-[11px]">{l.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </OwnerLayout>
  );
}