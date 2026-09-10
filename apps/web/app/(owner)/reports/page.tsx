"use client";

import React, { useState } from "react";
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

export default function ReportsPage() {
  const { sales, products, purchases, settings } = useStore();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  // Filter sales by selected period
  const now = new Date();
  const filteredSales = sales.filter((s) => {
    const saleDate = new Date(s.created_at);
    if (period === "today") {
      return (
        saleDate.getFullYear() === now.getFullYear() &&
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getDate() === now.getDate()
      );
    }
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return saleDate >= weekAgo;
    }
    // month
    return (
      saleDate.getFullYear() === now.getFullYear() &&
      saleDate.getMonth() === now.getMonth()
    );
  });

  // Dynamic calculations from real tenant data — filtered by period
  const grossSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalSubtotal = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
  const totalTax = filteredSales.reduce((acc, s) => acc + s.tax, 0);

  // Total inventory valuation (not period-dependent)
  const inventoryValuation = products.reduce(
    (acc, p) => acc + (p.stock ?? 0) * (p.cost_price || 0),
    0
  );

  // Estimated gross profit
  const totalPurchasesCost = purchases.reduce((acc, p) => acc + p.total_amount, 0);
  const grossProfit = Math.max(0, totalSubtotal - (totalPurchasesCost > 0 ? totalPurchasesCost * 0.7 : totalSubtotal * 0.6));
  const marginPct = grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0;

  // Payments breakdown
  const sinpeSales = filteredSales.filter((s) => s.payment_method === "SINPE").reduce((acc, s) => acc + s.total, 0);
  const cardSales = filteredSales.filter((s) => s.payment_method === "CARD").reduce((acc, s) => acc + s.total, 0);
  const cashSales = filteredSales.filter((s) => s.payment_method === "CASH_CRC").reduce((acc, s) => acc + s.total, 0);

  const sinpePct = grossSales > 0 ? Math.round((sinpeSales / grossSales) * 100) : 0;
  const cardPct = grossSales > 0 ? Math.round((cardSales / grossSales) * 100) : 0;
  const cashPct = grossSales > 0 ? Math.round((cashSales / grossSales) * 100) : 0;

  const handleExportCSV = () => {
    const headers = ["Numero_Venta", "Consecutivo", "Clave_Hacienda", "Fecha", "Cliente", "Subtotal", "IVA", "Total", "Forma_Pago"];
    const rows = filteredSales.map((s) => [
      s.sale_number,
      s.consecutive_number,
      s.numeric_key,
      s.created_at,
      `"${s.customer_name.replace(/"/g, '""')}"`,
      s.subtotal.toFixed(2),
      s.tax.toFixed(2),
      s.total.toFixed(2),
      s.payment_method,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_ventas_${period}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Reportes Financieros y Analítica</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Métricas reales de ventas, utilidad, IVA devengado y valoración de inventario
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
                Esta Semana
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

            <Button variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5 font-bold">
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ventas Brutas</span>
              <div className="p-2 bg-primary-subtle text-primary rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main font-mono">{formatCRC(grossSales)}</span>
              <span className="text-[11px] text-text-muted block mt-1">{filteredSales.length} transacciones en el período</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Utilidad Bruta Estimada</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-500 font-mono">{formatCRC(grossProfit)}</span>
              <span className="text-[11px] text-text-muted block mt-1">Margen comercial: {marginPct}%</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Total IVA Recaudado</span>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-500 font-mono">{formatCRC(totalTax)}</span>
              <span className="text-[11px] text-text-muted block mt-1">Para declaración D-104 Hacienda</span>
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
              <span className="text-[11px] text-text-muted block mt-1">{products.length} productos valorados</span>
            </div>
          </Card>
        </div>

        {/* Detailed Breakdown or Clean Empty State */}
        {filteredSales.length === 0 ? (
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
                      {filteredSales.filter((s) => s.payment_method === "SINPE").length} transacciones
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
                      {filteredSales.filter((s) => s.payment_method === "CARD").length} transacciones
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
                      {filteredSales.filter((s) => s.payment_method === "CASH_CRC").length} transacciones
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
                <CardTitle>Resumen Tributario Hacienda v4.4</CardTitle>
              </CardHeader>
              <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Ventas Gravadas (Base Imponible):</span>
                  <span className="font-mono font-bold text-text-main">{formatCRC(totalSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">IVA Devengado Total:</span>
                  <span className="font-mono font-bold text-purple-500">{formatCRC(totalTax)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-border">
                  <span className="text-text-main font-bold">Total Facturado en Colones:</span>
                  <span className="font-mono font-black text-emerald-500 text-sm">{formatCRC(grossSales)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}