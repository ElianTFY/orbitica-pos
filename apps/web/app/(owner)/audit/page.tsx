"use client";

import React, { useState } from "react";
import { ShieldCheck, Search, Filter } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: string;
  created_at: string;
  actor_name: string;
  action: string;
  resource: string;
  ip_address: string;
}

const DEMO_AUDIT: AuditEntry[] = [
  { id: "1", created_at: "2026-08-29 08:30:15", actor_name: "Cajero Principal", action: "SALE_COMPLETED", resource: "Sale #V-000012", ip_address: "192.168.1.45" },
  { id: "2", created_at: "2026-08-29 07:45:00", actor_name: "Carlos Propietario", action: "SALE_REFUNDED", resource: "Sale #V-000010", ip_address: "192.168.1.10" },
  { id: "3", created_at: "2026-08-29 07:00:12", actor_name: "Cajero Principal", action: "CASH_SESSION_OPENED", resource: "CashRegisterSession", ip_address: "192.168.1.45" },
  { id: "4", created_at: "2026-08-28 18:00:00", actor_name: "Carlos Propietario", action: "PRODUCT_CREATED", resource: "Product: Queso Turrialba", ip_address: "192.168.1.10" },
];

export default function AuditPage() {
  const [logs] = useState<AuditEntry[]>(DEMO_AUDIT);
  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Registro de Auditoría de Seguridad</h1>
          <p className="text-xs text-[#8E929E]">Trazabilidad inmutable de todas las acciones sensibles en el sistema</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Filtrar por acción, usuario o recurso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#141518] border border-[#26282E] rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF]"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8E929E] border-b border-[#26282E]">
                  <th className="pb-3">Fecha / Hora (UTC-6)</th>
                  <th className="pb-3">Usuario / Actor</th>
                  <th className="pb-3">Acción Realizada</th>
                  <th className="pb-3">Recurso Afectado</th>
                  <th className="pb-3 font-mono">IP Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-mono text-[#8E929E]">{l.created_at}</td>
                    <td className="py-3 font-semibold text-white">{l.actor_name}</td>
                    <td className="py-3">
                      <Badge variant="blue">{l.action}</Badge>
                    </td>
                    <td className="py-3 text-[#CFCFD4]">{l.resource}</td>
                    <td className="py-3 font-mono text-[11px] text-[#8E929E]">{l.ip_address}</td>
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
