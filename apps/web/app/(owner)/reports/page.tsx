"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Download,
  Package,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Reportes Financieros y Analítica</h1>
            <p className="text-xs text-text-muted">Métricas de ventas, margen de rentabilidad y valoración de inventario</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-surface p-1 rounded-xl border border-border">
              <button
                onClick={() => setPeriod("today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  period === "today" ? "bg-[#0EA5FF] text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setPeriod("week")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  period === "week" ? "bg-[#0EA5FF] text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  period === "month" ? "bg-[#0EA5FF] text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Este Mes
              </button>
            </div>

            <Button variant="secondary" size="sm">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Ventas Brutas</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">{formatCRC(4850000)}</span>
              <span className="text-[11px] text-emerald-400 block mt-1">+18.5% vs mes anterior</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Utilidad Bruta Estimada</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-400">{formatCRC(1843000)}</span>
              <span className="text-[11px] text-text-muted block mt-1">Margen comercial: 38%</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Total IVA Recaudado</span>
              <PieChart className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-purple-400">{formatCRC(557876)}</span>
              <span className="text-[11px] text-text-muted block mt-1">Para declaración D-104</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Valor del Inventario</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-cyan-400">{formatCRC(12450000)}</span>
              <span className="text-[11px] text-text-muted block mt-1">Valuación a precio de costo</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>Desglose por Métodos de Pago</CardTitle>
            </CardHeader>

            <div className="space-y-3">
              <div className="p-3 bg-surface-secondary rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">SINPE Móvil</span>
                  <span className="text-[10px] text-text-muted">178 transacciones</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{formatCRC(2425000)}</span>
                  <span className="text-[10px] text-primary font-semibold block">50.0% del total</span>
                </div>
              </div>

              <div className="p-3 bg-surface-secondary rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Tarjetas de Débito / Crédito</span>
                  <span className="text-[10px] text-text-muted">102 transacciones</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{formatCRC(1455000)}</span>
                  <span className="text-[10px] text-purple-400 font-semibold block">30.0% del total</span>
                </div>
              </div>

              <div className="p-3 bg-surface-secondary rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Efectivo en Colones (CRC)</span>
                  <span className="text-[10px] text-text-muted">62 transacciones</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{formatCRC(970000)}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block">20.0% del total</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>Top Productos con Mayor Margen</CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Uds</th>
                    <th className="pb-2 text-right">Venta</th>
                    <th className="pb-2 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26282E]">
                  <tr>
                    <td className="py-2.5 font-medium text-white">Coca-Cola 600ml</td>
                    <td className="py-2.5 text-right font-mono text-text-muted">140</td>
                    <td className="py-2.5 text-right font-mono text-white">{formatCRC(168000)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-400">{formatCRC(56000)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-white">Cerveza Imperial 350ml</td>
                    <td className="py-2.5 text-right font-mono text-text-muted">95</td>
                    <td className="py-2.5 text-right font-mono text-white">{formatCRC(133000)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-400">{formatCRC(42750)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-white">Café Rey 500g</td>
                    <td className="py-2.5 text-right font-mono text-text-muted">42</td>
                    <td className="py-2.5 text-right font-mono text-white">{formatCRC(117600)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-400">{formatCRC(29400)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
