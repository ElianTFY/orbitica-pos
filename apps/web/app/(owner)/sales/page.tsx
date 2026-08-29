"use client";

import React, { useState } from "react";
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  CheckCircle,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
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
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const filteredSales = sales.filter(
    (s) =>
      s.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openReceipt = (sale: SaleRecord) => {
    const key = `50629082600310188899900100001040000000012112345678`;
    setReceiptData({
      sale_number: sale.sale_number,
      created_at: sale.created_at,
      store: {
        name: "Minimarket San José Express",
        legal_name: "Comercial San José S.A.",
        legal_id: "3-101-888999",
        phone: "2222-3344",
        email: "facturacion@sanjoseexpress.cr",
        address: "San José Centro, Avenida Central",
        branch_name: "Sucursal Central (001)",
      },
      customer: {
        name: sale.customer_name,
        identification: null,
      },
      hacienda: {
        doc_type: "04 Tiquete Electrónico",
        consecutive: `00100001040000000012`,
        numeric_key: key,
        resolution: "Autorizada mediante resolución Nº DGT-R-48-2016",
        qr_url: `https://tribunet.hacienda.go.cr/docs/${key}`,
      },
      items: [
        { name: "Coca-Cola 600ml Descartable", quantity: 1, unit_price: 1200, tax_amount: 138, total: 1200 },
        { name: "Papas Tosty Clásicas", quantity: 1, unit_price: 1200, tax_amount: 138, total: 1200 },
      ],
      totals: {
        subtotal: sale.subtotal,
        discount: 0,
        tax: sale.tax,
        total: sale.total,
        currency: "CRC",
      },
      payments: [
        { method: sale.payment_method, amount: sale.total },
      ],
      footer_message: "¡Gracias por su compra en San José Express!",
    });
    setIsReceiptModalOpen(true);
  };

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setSales(sales.map((s) => (s.id === selectedSale.id ? { ...s, status: "REFUNDED" } : s)));
    setIsRefundModalOpen(false);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Historial de Ventas y Comprobantes</h1>
            <p className="text-xs text-[#8E929E]">Registro de transacciones POS, reimpresión de tiquetes y reembolsos</p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Buscar por número de venta o nombre de cliente..."
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
                  <th className="pb-3 text-right">IVA CR</th>
                  <th className="pb-3 text-right">Total (CRC)</th>
                  <th className="pb-3 text-center">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-[#0EA5FF]">{s.sale_number}</td>
                    <td className="py-3 font-mono text-[#8E929E]">{s.created_at}</td>
                    <td className="py-3 font-semibold text-white">{s.customer_name}</td>
                    <td className="py-3">
                      <Badge variant="blue">{s.payment_method}</Badge>
                    </td>
                    <td className="py-3 text-right font-mono text-[#8E929E]">{formatCRC(s.subtotal)}</td>
                    <td className="py-3 text-right font-mono text-[#8E929E]">{formatCRC(s.tax)}</td>
                    <td className="py-3 text-right font-mono font-bold text-white">{formatCRC(s.total)}</td>
                    <td className="py-3 text-center">
                      <Badge variant={s.status === "COMPLETED" ? "success" : "danger"}>
                        {s.status === "COMPLETED" ? "Completada" : "Devuelta / Reembolsada"}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => openReceipt(s)}>
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Tiquete
                        </Button>
                        {s.status === "COMPLETED" && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setSelectedSale(s);
                              setIsRefundModalOpen(true);
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Refund Modal */}
      {selectedSale && (
        <Modal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          title={`Devolución de Venta (${selectedSale.sale_number})`}
          maxWidth="sm"
        >
          <form onSubmit={handleRefund} className="space-y-4">
            <p className="text-xs text-[#8E929E]">
              Al confirmar el reembolso, las unidades vendidas se reintegrarán automáticamente al stock en el Libro Mayor de Inventario.
            </p>
            <Input
              label="Motivo de la Devolución"
              placeholder="Ej: Producto defectuoso o cambio por cliente"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsRefundModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger">
                Confirmar Reembolso y Reingreso a Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Thermal Receipt Modal */}
      {receiptData && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Tiquete Electrónico de Compra"
          maxWidth="md"
        >
          <ThermalReceipt data={receiptData} onClose={() => setIsReceiptModalOpen(false)} />
        </Modal>
      )}
    </OwnerLayout>
  );
}