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
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";
import { SaleRecord } from "@/types";

export default function SalesPage() {
  const { sales, settings, retryFetch } = useStore();
  const { hasPermission } = useAuth();
  const [refundSale, setRefundSale] = useState<SaleRecord | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  const openReceipt = async (sale: SaleRecord) => {
    if (busy) return;
    setBusy(true); setOperationError(null);
    try {
      const response = await api.request<any>(`/sales/${sale.id}/receipt`);
      setReceiptData(response.data);
      setIsReceiptModalOpen(true);
    } catch (error: any) { setOperationError(error?.message || "No se pudo recuperar el recibo guardado."); }
    finally { setBusy(false); }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {operationError && <p role="alert" className="text-semantic-danger-text">{operationError}</p>}
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
                      {sales.length === 0
                        ? "No hay ventas registradas aún. Al realizar ventas en el Punto de Venta se listarán aquí en tiempo real."
                        : "No se encontraron ventas que coincidan con la búsqueda."}
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
                          disabled={busy}
                          onClick={() => openReceipt(s)}
                          className="text-[11px] py-1 px-2.5"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Reimprimir
                        </Button>
                        {s.status === "COMPLETED" && hasPermission("pos:refund") && (
                          <Button variant="danger" size="sm" className="ml-2" disabled={busy}
                            onClick={() => { setRefundSale(s); setRefundReason(""); setOperationError(null); }}>
                            Devolver
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={Boolean(refundSale)} onClose={() => setRefundSale(null)} title="Devolución total de venta" maxWidth="md">
        <form className="space-y-4" onSubmit={async event => {
          event.preventDefault();
          if (!refundSale || busy) return;
          setBusy(true); setOperationError(null);
          try {
            const key = `refund-${refundSale.id}`;
            await api.request(`/sales/${refundSale.id}/refund`, { method: "POST",
              headers: { "Idempotency-Key": key }, body: { reason: refundReason } });
            await retryFetch(); setRefundSale(null);
          } catch (error: any) { setOperationError(error?.message || "No se pudo devolver la venta."); }
          finally { setBusy(false); }
        }}>
          <p>Se devolverán todos los artículos de {refundSale?.sale_number}. El reembolso en efectivo requiere una caja abierta. Si Hacienda aceptó el original, se creará una nota de crédito pendiente de procesamiento.</p>
          <p className="text-sm text-text-muted">Los reembolsos por tarjeta o SINPE se deben efectuar y verificar por separado en el banco.</p>
          {operationError && <p role="alert" className="text-semantic-danger-text">{operationError}</p>}
          <Input label="Motivo de devolución" value={refundReason} onChange={e => setRefundReason(e.target.value)} minLength={3} maxLength={255} required />
          <Button type="submit" variant="danger" disabled={busy}>{busy ? "Procesando…" : "Confirmar devolución total"}</Button>
        </form>
      </Modal>

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