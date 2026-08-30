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
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCRC } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border p-6 rounded-3xl shadow-card transition-colors">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-text-main tracking-tight">Panel de Control - Resumen Diario</h1>
            <p className="text-xs text-text-muted">Sucursal Central | Moneda: CRC (Colones Costarricenses)</p>
          </div>
          <Link href="/pos">
            <Button variant="primary" size="lg" className="font-bold tracking-wide">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Abrir Punto de Venta (F2)
            </Button>
          </Link>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ventas de Hoy</span>
              <div className="p-2 bg-primary-subtle text-primary rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main font-mono">{formatCRC(285400)}</span>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-500 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+12.4% vs ayer</span>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ventas del Mes</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main font-mono">{formatCRC(4850000)}</span>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-500 font-bold">
                <span>342 transacciones</span>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Ticket Promedio</span>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-text-main font-mono">{formatCRC(8345)}</span>
              <span className="text-[11px] text-text-muted block">Margen promedio: 38%</span>
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
              <span className="text-2xl font-black text-amber-500">3 Productos</span>
              <span className="text-[11px] text-text-muted block">Requiere reposición</span>
            </div>
          </Card>
        </div>

        {/* Charts & Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 space-y-4">
            <CardHeader>
              <CardTitle>Métodos de Pago (Hoy)</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text-main">SINPE Móvil</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-text-main font-mono">{formatCRC(142000)}</span>
                  <span className="text-[10px] text-text-muted block">50% del total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-text-main">Tarjeta</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-text-main font-mono">{formatCRC(85400)}</span>
                  <span className="text-[10px] text-text-muted block">30% del total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border">
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-text-main">Efectivo CRC</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-text-main font-mono">{formatCRC(58000)}</span>
                  <span className="text-[10px] text-text-muted block">20% del total</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 space-y-4">
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de productos más vendidos">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Producto</th>
                    <th scope="col" className="pb-3 font-bold">Categoría</th>
                    <th scope="col" className="pb-3 font-bold">Vendidos</th>
                    <th scope="col" className="pb-3 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 font-bold text-text-main flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      Coca-Cola 600ml Descartable
                    </td>
                    <td className="py-3 text-text-secondary">Bebidas</td>
                    <td className="py-3 font-bold text-text-main font-mono">48 uds</td>
                    <td className="py-3 font-black text-right text-emerald-500 font-mono">{formatCRC(57600)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-text-main flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      Cerveza Imperial 350ml Lata
                    </td>
                    <td className="py-3 text-text-secondary">Licores</td>
                    <td className="py-3 font-bold text-text-main font-mono">35 uds</td>
                    <td className="py-3 font-black text-right text-emerald-500 font-mono">{formatCRC(49000)}</td>
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