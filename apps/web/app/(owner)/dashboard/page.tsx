"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Smartphone,
  Banknote,
  Package,
  Receipt,
  Sparkles,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/features/store/store-context";
import { formatCRC } from "@/lib/utils";

export default function DashboardPage() {
  const { sales, products, settings, activeCashSession } = useStore();

  const totalSalesAmount = sales.reduce((acc, s) => acc + s.total, 0);
  const totalTransactions = sales.length;
  const averageTicket = totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

  const lowStockProducts = products.filter((p) => (p.stock ?? 0) <= p.min_stock_alert);

  const sinpeSales = sales.filter((s) => s.payment_method === "SINPE").reduce((acc, s) => acc + s.total, 0);
  const cardSales = sales.filter((s) => s.payment_method === "CARD").reduce((acc, s) => acc + s.total, 0);
  const cashSales = sales.filter((s) => s.payment_method === "CASH_CRC").reduce((acc, s) => acc + s.total, 0);

  const sinpePct = totalSalesAmount > 0 ? Math.round((sinpeSales / totalSalesAmount) * 100) : 0;
  const cardPct = totalSalesAmount > 0 ? Math.round((cardSales / totalSalesAmount) * 100) : 0;
  const cashPct = totalSalesAmount > 0 ? Math.round((cashSales / totalSalesAmount) * 100) : 0;

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border p-6 rounded-3xl shadow-card transition-colors">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-text-main tracking-tight">
              {settings.trade_name} — Resumen Operativo
            </h1>
            <p className="text-xs text-text-muted">
              {settings.branch_name} | Cédula: {settings.identification_number || "Por configurar"} | Moneda: {settings.default_currency}
            </p>
          </div>
          <Link href="/pos">
            <Button variant="primary" size="lg" className="font-bold tracking-wide bg-emerald-600 hover:bg-emerald-500 text-white">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Ir al Punto de Venta (POS)
            </Button>
          </Link>
        </div>

        {/* Onboarding Quick Setup Checklist */}
        {(!settings.identification_number || products.length === 0 || sales.length === 0) && (
          <Card className="p-5 bg-gradient-to-br from-primary-subtle/50 to-surface border border-primary/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs">
                  ★
                </div>
                <div>
                  <h2 className="text-sm font-black text-text-main">Guía de Inicio Rápido para tu Negocio</h2>
                  <p className="text-[11px] text-text-muted">Completa estos pasos para emitir tus primeras facturas electrónicas y operar tu comercio al 100%.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/onboarding">
                  <Button variant="primary" size="sm" className="text-xs font-bold gap-1 bg-primary hover:bg-primary/90">
                    <Sparkles className="w-3.5 h-3.5" />
                    Abrir Asistente (8 Pasos)
                  </Button>
                </Link>
                <span className="text-[11px] font-mono font-bold text-primary px-2.5 py-1 bg-surface rounded-lg border border-border">
                  {Number(Boolean(settings.identification_number)) + Number(Boolean(products.length > 0)) + Number(Boolean(sales.length > 0))} / 3 Pasos
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              {/* Step 1 */}
              <Link href="/settings" className="block">
                <div className={`p-3 rounded-2xl border transition-all ${
                  settings.identification_number
                    ? "bg-emerald-500/5 border-emerald-500/30 text-text-main"
                    : "bg-surface border-border hover:border-primary text-text-secondary"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Paso 1</span>
                    {settings.identification_number ? (
                      <span className="text-[10px] font-bold text-emerald-500">✓ Listo</span>
                    ) : (
                      <span className="text-[10px] font-bold text-primary">Configurar →</span>
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1">Datos Fiscales y Hacienda</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Razón social, cédula y credenciales ATV</p>
                </div>
              </Link>

              {/* Step 2 */}
              <Link href="/products" className="block">
                <div className={`p-3 rounded-2xl border transition-all ${
                  products.length > 0
                    ? "bg-emerald-500/5 border-emerald-500/30 text-text-main"
                    : "bg-surface border-border hover:border-primary text-text-secondary"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Paso 2</span>
                    {products.length > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-500">✓ {products.length} SKUs</span>
                    ) : (
                      <span className="text-[10px] font-bold text-primary">Agregar →</span>
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1">Crear Productos en Catálogo</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Precios, impuestos (IVA) y stock inicial</p>
                </div>
              </Link>

              {/* Step 3 */}
              <Link href="/pos" className="block">
                <div className={`p-3 rounded-2xl border transition-all ${
                  sales.length > 0
                    ? "bg-emerald-500/5 border-emerald-500/30 text-text-main"
                    : "bg-surface border-border hover:border-primary text-text-secondary"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Paso 3</span>
                    {sales.length > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-500">✓ {sales.length} Ventas</span>
                    ) : (
                      <span className="text-[10px] font-bold text-primary">Abrir POS →</span>
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1">Realizar Primera Venta POS</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Cobro en SINPE, Tarjeta o Efectivo</p>
                </div>
              </Link>
            </div>
          </Card>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ventas Totales</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-500 font-mono">{formatCRC(totalSalesAmount)}</span>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-text-muted font-medium">
                <span>{totalTransactions} ventas registradas</span>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ticket Promedio</span>
              <div className="p-2 bg-primary-subtle text-primary rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main font-mono">{formatCRC(averageTicket)}</span>
              <span className="text-[11px] text-text-muted block">Por transacción completada</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Productos Activos</span>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main">{products.length} SKUs</span>
              <span className="text-[11px] text-text-muted block">En catálogo para la venta</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Bajo Stock</span>
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-black ${lowStockProducts.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                {lowStockProducts.length} {lowStockProducts.length === 1 ? "Producto" : "Productos"}
              </span>
              <span className="text-[11px] text-text-muted block">
                {lowStockProducts.length > 0 ? "Requiere reposición de stock" : "Stock en niveles óptimos"}
              </span>
            </div>
          </Card>
        </div>

        {/* Charts & Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 space-y-4">
            <CardHeader>
              <CardTitle>Métodos de Pago Utilizados</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text-main">SINPE Móvil</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-text-main font-mono">{formatCRC(sinpeSales)}</span>
                  <span className="text-[10px] text-text-muted block">{sinpePct}% del total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-text-main">Tarjeta</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-text-main font-mono">{formatCRC(cardSales)}</span>
                  <span className="text-[10px] text-text-muted block">{cardPct}% del total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-text-main">Efectivo CRC</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-text-main font-mono">{formatCRC(cashSales)}</span>
                  <span className="text-[10px] text-text-muted block">{cashPct}% del total</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Últimas Ventas Realizadas</CardTitle>
                {sales.length > 0 && (
                  <Link href="/sales" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                    Ver todas ({sales.length})
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de últimas ventas">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Nº Venta</th>
                    <th scope="col" className="pb-3 font-bold">Cliente</th>
                    <th scope="col" className="pb-3 font-bold">Pago</th>
                    <th scope="col" className="pb-3 font-bold">Fecha</th>
                    <th scope="col" className="pb-3 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        No hay ventas registradas aún. Abre el Punto de Venta para realizar tu primera venta.
                      </td>
                    </tr>
                  ) : (
                    sales.slice(0, 5).map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-bold text-text-main flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-primary" />
                          <span className="font-mono">{s.sale_number}</span>
                        </td>
                        <td className="py-3 text-text-secondary">{s.customer_name}</td>
                        <td className="py-3">
                          <span className="text-[11px] font-mono font-bold text-text-muted">
                            {s.payment_method === "CASH_CRC" ? "Efectivo" : s.payment_method}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-text-muted text-[11px]">{s.created_at}</td>
                        <td className="py-3 font-black text-right text-emerald-500 font-mono">{formatCRC(s.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}