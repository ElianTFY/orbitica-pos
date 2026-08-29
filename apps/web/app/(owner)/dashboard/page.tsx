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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#141518] to-[#1A1B1F] border border-[#26282E] p-6 rounded-2xl">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Panel de Control - Resumen Diario</h1>
            <p className="text-xs text-[#8E929E]">Sucursal Central | Moneda: CRC (Colones Costarricenses)</p>
          </div>
          <Link href="/pos">
            <Button variant="primary" size="lg" className="font-bold tracking-wide shadow-lg shadow-[#0EA5FF]/20">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Abrir Punto de Venta (F2)
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase tracking-wider">Ventas de Hoy</span>
              <div className="p-2 bg-[#0EA5FF]/10 rounded-lg">
                <DollarSign className="w-4 h-4 text-[#0EA5FF]" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">{formatCRC(285400)}</span>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+12.4% vs ayer</span>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase tracking-wider">Ventas del Mes</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">{formatCRC(4850000)}</span>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-medium">
                <span>342 transacciones</span>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase tracking-wider">Ticket Promedio</span>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <ShoppingCart className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">{formatCRC(8345)}</span>
              <span className="text-[11px] text-[#8E929E] block">Margen promedio: 38%</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase tracking-wider">Bajo Stock</span>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-400">3 Productos</span>
              <span className="text-[11px] text-[#8E929E] block">Requiere reposición</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 space-y-4">
            <CardHeader>
              <CardTitle>Métodos de Pago (Hoy)</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#1A1B1F] rounded-lg">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-[#0EA5FF]" />
                  <span className="text-xs font-semibold text-white">SINPE Móvil</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{formatCRC(142000)}</span>
                  <span className="text-[10px] text-[#8E929E] block">50% del total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#1A1B1F] rounded-lg">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white">Tarjeta</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{formatCRC(85400)}</span>
                  <span className="text-[10px] text-[#8E929E] block">30% del total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#1A1B1F] rounded-lg">
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Efectivo CRC</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{formatCRC(58000)}</span>
                  <span className="text-[10px] text-[#8E929E] block">20% del total</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 space-y-4">
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#8E929E] border-b border-[#26282E]">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2">Categoría</th>
                    <th className="pb-2">Vendidos</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26282E]">
                  <tr>
                    <td className="py-2.5 font-medium text-white flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-[#0EA5FF]" />
                      Coca-Cola 600ml Descartable
                    </td>
                    <td className="py-2.5 text-[#CFCFD4]">Bebidas</td>
                    <td className="py-2.5 font-bold text-white">48 uds</td>
                    <td className="py-2.5 font-bold text-right text-emerald-400">{formatCRC(57600)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-white flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-[#0EA5FF]" />
                      Cerveza Imperial 350ml Lata
                    </td>
                    <td className="py-2.5 text-[#CFCFD4]">Licores</td>
                    <td className="py-2.5 font-bold text-white">35 uds</td>
                    <td className="py-2.5 font-bold text-right text-emerald-400">{formatCRC(49000)}</td>
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
