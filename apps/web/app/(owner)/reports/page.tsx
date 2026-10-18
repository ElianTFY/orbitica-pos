"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Download,
  Package,
  Layers,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { api } from "@/lib/api-client";

type ReportSummary = {
  total_sales: string; total_subtotal: string; total_taxes: string; total_cost: string;
  estimated_profit: string; transaction_count: number;
  payments_breakdown: { method: string; total_amount: string; transaction_count: number }[];
};
type InventorySummary = { valuation_at_cost: string; total_products: number };

export default function ReportsPage() {
  const { branches, settings } = useStore();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const branchId = branches[0]?.id;
  const query = useMemo(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    const start = new Date(`${part("year")}-${part("month")}-${period === "month" ? "01" : part("day")}T00:00:00-06:00`);
    if (period === "week") start.setTime(start.getTime() - 6 * 86400000);
    return new URLSearchParams({ start_date: start.toISOString(), end_date: now.toISOString(), currency: "CRC", ...(branchId ? { branch_id: branchId } : {}) }).toString();
  }, [period, branchId, refresh]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([
      api.request<ReportSummary>(`/reports/sales-summary?${query}`),
      api.request<InventorySummary>(`/reports/inventory-valuation?branch_id=${branchId}`),
    ]).then(([sales, stock]) => {
      if (!cancelled) { setReport(sales.data); setInventory(stock.data); }
    }).catch(error => {
      if (!cancelled) setError(error?.message || "No fue posible cargar el reporte.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, query]);

  const grossSales = Number(report?.total_sales || 0);
  const totalSubtotal = Number(report?.total_subtotal || 0);
  const totalTax = Number(report?.total_taxes || 0);
  const grossProfit = Number(report?.estimated_profit || 0);
  const inventoryValuation = Number(inventory?.valuation_at_cost || 0);
  const marginPct = totalSubtotal ? Math.round(grossProfit / totalSubtotal * 100) : 0;
  const paymentRows = (...methods: string[]) => (report?.payments_breakdown || []).filter(row => methods.includes(row.method));
  const paymentTotal = (...methods: string[]) => paymentRows(...methods).reduce((sum, row) => sum + Number(row.total_amount), 0);
  const paymentCount = (...methods: string[]) => paymentRows(...methods).reduce((sum, row) => sum + row.transaction_count, 0);
  const sinpeSales = paymentTotal("SINPE"), cardSales = paymentTotal("CARD"), cashSales = paymentTotal("CASH", "CASH_CRC");
  const sinpePct = grossSales ? Math.round(sinpeSales / grossSales * 100) : 0;
  const cardPct = grossSales ? Math.round(cardSales / grossSales * 100) : 0;
  const cashPct = grossSales ? Math.round(cashSales / grossSales * 100) : 0;

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const result = await api.request<string>(`/reports/sales-export?${query}`);
      const url = URL.createObjectURL(new Blob([result.data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `ventas_CRC_${period}.csv`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (error: any) { setError(error?.message || "No se pudo exportar el reporte."); }
    finally { setExporting(false); }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Reportes Financieros y Analítica</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Ventas, costo registrado, utilidad bruta y valoración de inventario
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label="Período de análisis"
              className="flex bg-surface p-1 rounded-2xl border border-border"
            >
              <button
                type="button"
                role="tab"
                aria-selected={period === "today"}
                onClick={() => setPeriod("today")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "today" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period === "week"}
                onClick={() => setPeriod("week")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "week" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                Últimos 7 días
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period === "month"}
                onClick={() => setPeriod("month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === "month" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                Este Mes
              </button>
            </div>

            <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={loading || exporting || Boolean(error) || !report} className="gap-1.5 font-bold">
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <p className="text-xs text-text-muted">CRC · {settings.branch_name} · Período en hora de Costa Rica. Ventas guardadas que siguen vigentes; excluye devueltas y anuladas. El estado de Hacienda se consulta en Facturación.</p>
        {loading ? <p role="status">Cargando reporte…</p> : error ? <div role="alert" className="text-semantic-danger-text">{error} <button className="underline" onClick={() => setRefresh(value => value + 1)}>Reintentar</button></div> : <>
        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ventas con IVA</span>
              <div className="p-2 bg-primary-subtle text-primary rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main font-mono">{formatCRC(grossSales)}</span>
              <span className="text-[11px] text-text-muted block mt-1">{(report?.transaction_count || 0)} transacciones en el período</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Utilidad Bruta</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-500 font-mono">{formatCRC(grossProfit)}</span>
              <span className="text-[11px] text-text-muted block mt-1">Margen sin IVA: {marginPct}% · según costo guardado</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">IVA Registrado</span>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-500 font-mono">{formatCRC(totalTax)}</span>
              <span className="text-[11px] text-text-muted block mt-1">IVA de ventas vigentes del período</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Valor del Inventario</span>
              <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-xl">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-cyan-500 font-mono">{formatCRC(inventoryValuation)}</span>
              <span className="text-[11px] text-text-muted block mt-1">{inventory?.total_products || 0} productos valorados</span>
            </div>
          </Card>
        </div>

        {/* Detailed Breakdown or Clean Empty State */}
        {(report?.transaction_count || 0) === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">No hay ventas registradas en este período</h2>
              <p className="text-xs text-text-muted">
                Los gráficos de rendimiento, comparativas mensuales y desglose de formas de pago se generarán automáticamente conforme registres ventas en el punto de venta.
              </p>
            </div>
            <Link href="/pos">
              <Button variant="primary">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ir al Punto de Venta
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>Desglose por Formas de Pago</CardTitle>
              </CardHeader>

              <div className="space-y-3">
                <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">SINPE Móvil</span>
                    <span className="text-[10px] text-text-muted">
                      {paymentCount("SINPE")} transacciones
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-text-main font-mono">{formatCRC(sinpeSales)}</span>
                    <span className="text-[10px] text-primary font-bold block">{sinpePct}% del total</span>
                  </div>
                </div>

                <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">Tarjetas de Débito / Crédito</span>
                    <span className="text-[10px] text-text-muted">
                      {paymentCount("CARD")} transacciones
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-text-main font-mono">{formatCRC(cardSales)}</span>
                    <span className="text-[10px] text-purple-500 font-bold block">{cardPct}% del total</span>
                  </div>
                </div>

                <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-main block">Efectivo en Colones (CRC)</span>
                    <span className="text-[10px] text-text-muted">
                      {paymentCount("CASH", "CASH_CRC")} transacciones
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-text-main font-mono">{formatCRC(cashSales)}</span>
                    <span className="text-[10px] text-emerald-500 font-bold block">{cashPct}% del total</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>Resumen de ventas guardadas</CardTitle>
              </CardHeader>
              <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Ventas sin IVA, después de descuentos:</span>
                  <span className="font-mono font-bold text-text-main">{formatCRC(totalSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">IVA registrado:</span>
                  <span className="font-mono font-bold text-purple-500">{formatCRC(totalTax)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-border">
                  <span className="text-text-main font-bold">Total vendido en colones:</span>
                  <span className="font-mono font-black text-emerald-500 text-sm">{formatCRC(grossSales)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
        </>}
      </div>
    </OwnerLayout>
  );
}