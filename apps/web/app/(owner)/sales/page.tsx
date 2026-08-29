"use client";

import React, { useState } from "react";
import {
  Receipt,
  Search,
  Eye,
  RotateCcw,
  CheckCircle,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";

interface SaleRecord {
  id: string;
  sale_number: string;
  created_at: string;
  customer_name: string;
  payment_method: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "COMPLETED" | "REFUNDED";
  items_count: number;
}

const DEMO_SALES: SaleRecord[] = [
  { id: "1", sale_number: "V-000012", created_at: "2026-08-29 08:30", customer_name: "Cliente Contado", payment_method: "SINPE", subtotal: 2123.89, tax: 276.11, total: 2400, status: "COMPLETED", items_count: 2 },
  { id: "2", sale_number: "V-000011", created_at: "2026-08-29 08:15", customer_name: "Juan Mora", payment_method: "CASH_CRC", subtotal: 4955.75, tax: 644.25, total: 5600, status: "COMPLETED", items_count: 4 },
  { id: "3", sale_number: "V-000010", created_at: "2026-08-29 07:45", customer_name: "María Brenes", payment_method: "CARD", subtotal: 7522.12, tax: 977.88, total: 8500, status: "REFUNDED", items_count: 3 },
];

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>(DEMO_SALES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const filteredSales = sales.filter(
    (s) =>
      s.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setSales(sales.map((s) => (s.id === selectedSale.id ? { ...s, status: "REFUNDED" } : s)));
    setIsRefundModalOpen(false);
    setIsDetailModalOpen(false);
    setRefundReason("");
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Historial de Ventas y Comprobantes</h1>
            <p className="text-xs text-[#8E929E]">Registro de transacciones POS, formas de pago y devoluciones</p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Buscar por número de venta o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#141518] border border-[#26282E] rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF]"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8E929E] border-b border-[#26282E]">
                  <th className="pb-3">Nº Venta</th>
                  <th className="pb-3">Fecha / Hora</th>
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Método de Pago</th>
                  <th className="pb-3 text-right">Subtotal</th>
                  <th className="pb-3 text-right">IVA</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-center">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-[#0EA5FF]">{s.sale_number}</td>
                    <td className="py-3 font-mono text-[#8E929E]">{s.created_at}</td>
                    <td className="py-3 font-medium text-white">{s.customer_name}</td>
                    <td className="py-3">
                      <Badge variant="blue">{s.payment_method}</Badge>
                    </td>
                    <td className="py-3 text-right font-mono text-[#8E929E]">{formatCRC(s.subtotal)}</td>
                    <td className="py-3 text-right font-mono text-[#8E929E]">{formatCRC(s.tax)}</td>
                    <td className="py-3 text-right font-mono font-bold text-white">{formatCRC(s.total)}</td>
                    <td className="py-3 text-center">
                      {s.status === "COMPLETED" ? (
                        <Badge variant="success">Completada</Badge>
                      ) : (
                        <Badge variant="danger">Devuelta / Reembolso</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSale(s);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedSale && (
        <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Detalle de Venta #${selectedSale.sale_number}`} maxWidth="md">
          <div className="space-y-4">
            <div className="p-4 bg-[#1A1B1F] border border-[#26282E] rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8E929E]">Fecha:</span>
                <span className="text-white font-mono">{selectedSale.created_at}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E929E]">Cliente:</span>
                <span className="text-white font-medium">{selectedSale.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E929E]">Método de Pago:</span>
                <span className="text-[#0EA5FF] font-semibold">{selectedSale.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E929E]">Estado:</span>
                <span className={selectedSale.status === "COMPLETED" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {selectedSale.status}
                </span>
              </div>
            </div>

            <div className="p-3 border-t border-b border-[#26282E] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#8E929E]">
                <span>Subtotal Neto:</span>
                <span className="font-mono text-white">{formatCRC(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#8E929E]">
                <span>IVA Costa Rica (13%):</span>
                <span className="font-mono text-white">{formatCRC(selectedSale.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-1">
                <span>TOTAL:</span>
                <span className="text-[#0EA5FF] font-mono">{formatCRC(selectedSale.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {selectedSale.status === "COMPLETED" && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsRefundModalOpen(true);
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Procesar Devolución
                </Button>
              )}
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedSale && (
        <Modal isOpen={isRefundModalOpen} onClose={() => setIsRefundModalOpen(false)} title="Confirmar Devolución / Reembolso" maxWidth="md">
          <form onSubmit={handleRefund} className="space-y-4">
            <p className="text-xs text-[#8E929E]">
              Al procesar la devolución de la venta <strong className="text-white">#{selectedSale.sale_number}</strong> por{" "}
              <strong className="text-emerald-400">{formatCRC(selectedSale.total)}</strong>, el inventario se reintegrará automáticamente al stock de la sucursal.
            </p>

            <Input
              label="Motivo Obligatorio de la Devolución"
              placeholder="Ej: Producto en mal estado o cambio por otro artículo"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
            />

            <div className="pt-3 border-t border-[#26282E] flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsRefundModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger">
                Confirmar Devolución y Reingresar Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </OwnerLayout>
  );
}