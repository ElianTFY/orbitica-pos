"use client";

import React, { useState } from "react";
import {
  Receipt,
  Search,
  Printer,
  CheckCircle,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import { useStore } from "@/features/store/store-context";
import { formatCRC } from "@/lib/utils";
import { SaleRecord } from "@/types";

export default function SalesPage() {
  const { sales, settings } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const filteredSales = sales.filter(
    (s) =>
      s.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.consecutive_number?.includes(searchQuery)
  );

  const openReceipt = (sale: SaleRecord) => {
    // Use the exact receipt data stored at time of sale, if available
    if (sale.receipt_data) {
      setReceiptData(sale.receipt_data);
      setIsReceiptModalOpen(true);
      return;
    }

    // Fallback: reconstruct from available data (for older sales without snapshot)
    const key = sale.numeric_key || `50629082600${settings.identification_number.padEnd(12, "0").slice(0, 12)}00100001040000000001112345678`;
    setReceiptData({
      sale_number: sale.sale_number,
      created_at: sale.created_at,
      store: {
        name: settings.trade_name,
        legal_name: settings.legal_name,
        legal_id: settings.identification_number,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        branch_name: settings.branch_name,
      },
      customer: {
        name: sale.customer_name,
        identification: sale.customer_cedula || null,
      },
      hacienda: {
        doc_type: "Tiquete Electrónico (04)",
        consecutive: sale.consecutive_number || "00100001040000000001",
        numeric_key: key,
        resolution: "Autorizada mediante resolución Nº DGT-R-48-2016",
        qr_url: `https://tribunet.hacienda.go.cr/docs/${key}`,
      },
      items: sale.items_snapshot
        ? sale.items_snapshot
        : [
            {
              name: "Venta Registrada POS",
              quantity: sale.items_count,
              unit_price: sale.subtotal / (sale.items_count || 1),
              tax_amount: sale.tax,
              total: sale.total,
            },
          ],
      totals: {
        subtotal: sale.subtotal,
        discount: 0,
        tax: sale.tax,
        total: sale.total,
        currency: settings.default_currency,
      },
      payments: [
        {
          method: sale.payment_method,
          amount: sale.total,
          reference: null,
        },
      ],
      footer_message: `¡Gracias por su preferencia en ${settings.trade_name}!`,
    });
    setIsReceiptModalOpen(true);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Historial de Ventas</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Registro de todas las transacciones realizadas en caja
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar venta por número o cliente"
            placeholder="Buscar por número de venta (Ej: V-000001) o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Sales Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de ventas">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Nº Venta</th>
                  <th scope="col" className="pb-3 font-bold">Fecha / Hora</th>
                  <th scope="col" className="pb-3 font-bold">Cliente</th>
                  <th scope="col" className="pb-3 font-bold">Método Pago</th>
                  <th scope="col" className="pb-3 font-bold">Subtotal</th>
                  <th scope="col" className="pb-3 font-bold">IVA</th>
                  <th scope="col" className="pb-3 font-bold">Total</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Tiquete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-text-muted">
                      No hay ventas registradas aún. Al realizar ventas en el Punto de Venta se listarán aquí en tiempo real.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-bold text-text-main flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono">{s.sale_number}</span>
                      </td>
                      <td className="py-3 font-mono text-text-muted text-[11px]">{s.created_at}</td>
                      <td className="py-3 text-text-secondary">{s.customer_name}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          {s.payment_method === "SINPE" && <Smartphone className="w-3.5 h-3.5 text-primary" />}
                          {s.payment_method === "CARD" && <CreditCard className="w-3.5 h-3.5 text-purple-500" />}
                          {s.payment_method === "CASH_CRC" && <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                          <span className="font-mono text-[11px] text-text-muted">
                            {s.payment_method === "CASH_CRC" ? "Efectivo" : s.payment_method}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-text-secondary">{formatCRC(s.subtotal)}</td>
                      <td className="py-3 font-mono text-text-secondary">{formatCRC(s.tax)}</td>
                      <td className="py-3 font-black text-emerald-500 font-mono text-sm">{formatCRC(s.total)}</td>
                      <td className="py-3">
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completada
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReceipt(s)}
                          className="text-[11px] py-1 px-2.5"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Reimprimir
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Thermal Receipt Modal */}
      {receiptData && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Reimpresión de Tiquete"
          maxWidth="md"
        >
          <ThermalReceipt data={receiptData} onClose={() => setIsReceiptModalOpen(false)} />
        </Modal>
      )}
    </OwnerLayout>
  );
}