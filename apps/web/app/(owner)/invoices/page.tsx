"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  Send,
  ShieldCheck,
  Code2,
  RefreshCw,
  Download,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { InvoiceRecord } from "@/types";
import { formatCRC } from "@/lib/utils";

export default function InvoicesPage() {
  const { invoices, settings } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.consecutive_number.includes(searchQuery) ||
      inv.numeric_key.includes(searchQuery) ||
      inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenXml = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setIsXmlModalOpen(true);
  };

  const handleDownloadXml = (inv: InvoiceRecord) => {
    if (!inv.xml_signed) return;
    const blob = new Blob([inv.xml_signed], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.numeric_key}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Comprobantes Electrónicos Hacienda CR</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Facturas (01), Tiquetes (04) y Notas de Crédito (03) con firmado XAdES-BES
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.atv_username ? "blue" : "default"} className="py-1.5 px-3">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {settings.atv_username ? `ATV v4.4 (${settings.atv_environment})` : "ATV v4.4 (Sin configurar)"}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar comprobante por consecutivo, clave numérico o cliente"
            placeholder="Buscar por consecutivo, clave de 50 dígitos o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Invoices Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de comprobantes electrónicos de Hacienda">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Tipo</th>
                  <th scope="col" className="pb-3 font-bold">Consecutivo (20 Dígitos)</th>
                  <th scope="col" className="pb-3 font-bold">Clave Numérica (50 Dígitos)</th>
                  <th scope="col" className="pb-3 font-bold">Cliente</th>
                  <th scope="col" className="pb-3 font-bold">Fecha / Hora</th>
                  <th scope="col" className="pb-3 font-bold">Total</th>
                  <th scope="col" className="pb-3 font-bold">Estado Hacienda</th>
                  <th scope="col" className="pb-3 font-bold text-right">XML XAdES-BES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">
                      {invoices.length === 0
                        ? "No hay comprobantes emitidos aún. Al realizar ventas en el Punto de Venta se generarán automáticamente aquí."
                        : "No se encontraron comprobantes que coincidan con la búsqueda."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-bold text-text-main">
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-surface-secondary rounded-lg border border-border">
                          {inv.doc_type_label}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-primary font-bold">{inv.consecutive_number}</td>
                      <td className="py-3 font-mono text-text-muted text-[10px] max-w-[200px] truncate" title={inv.numeric_key}>
                        {inv.numeric_key}
                      </td>
                      <td className="py-3 text-text-secondary">{inv.customer_name}</td>
                      <td className="py-3 font-mono text-text-muted text-[11px]">{inv.created_at}</td>
                      <td className="py-3 font-black text-emerald-500 font-mono">{formatCRC(inv.total)}</td>
                      <td className="py-3">
                        <Badge variant={inv.status === "ACCEPTED" ? "success" : inv.status === "PENDING" ? "warning" : "danger"}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {inv.status === "ACCEPTED" ? "Aceptado" : inv.status === "PENDING" ? "Pendiente" : "Rechazado"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenXml(inv)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary text-[11px] font-mono flex items-center gap-1"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            Ver XML
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadXml(inv)}
                            className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
                            title="Descargar XML firmado"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* XML Viewer Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isXmlModalOpen}
          onClose={() => setIsXmlModalOpen(false)}
          title={`XML Firmado XAdES-BES — Consecutivo ${selectedInvoice.consecutive_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-surface-secondary rounded-xl border border-border text-xs space-y-1">
              <div><strong>Clave Numérica:</strong> <span className="font-mono text-[11px]">{selectedInvoice.numeric_key}</span></div>
              <div><strong>Estado Hacienda:</strong> <span className="text-emerald-500 font-bold">{selectedInvoice.hacienda_message}</span></div>
            </div>

            <pre className="p-4 bg-background border border-border rounded-2xl text-[11px] font-mono text-text-secondary overflow-x-auto max-h-96">
              {selectedInvoice.xml_signed}
            </pre>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsXmlModalOpen(false)}>
                Cerrar
              </Button>
              <Button variant="primary" onClick={() => handleDownloadXml(selectedInvoice)}>
                <Download className="w-4 h-4 mr-1.5" />
                Descargar XML
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  );
}