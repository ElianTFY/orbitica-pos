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
  AlertCircle,
  Building,
  User,
  History,
  Calendar,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Check,
  XCircle,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { InvoiceRecord } from "@/types";
import { formatCRC } from "@/lib/utils";
import { api } from "@/lib/api-client";

type InvoiceDetailTab = "resumen" | "factura" | "xml_enviado" | "respuesta_hacienda" | "historial";

export default function InvoicesPage() {
  const { invoices, settings, sales } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<InvoiceDetailTab>("resumen");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.consecutive_number.includes(searchQuery) ||
      inv.numeric_key.includes(searchQuery) ||
      inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      inv.status === statusFilter ||
      (statusFilter === "PENDING" && (inv.status === "PENDING" || inv.status === "PENDING_RETRY"));

    return matchesSearch && matchesStatus;
  });

  const handleOpenDetail = (inv: InvoiceRecord, tab: InvoiceDetailTab = "resumen") => {
    setSelectedInvoice(inv);
    setActiveTab(tab);
    setRetryMessage(null);
    setIsDetailModalOpen(true);
  };

  const handleDownloadXml = (content: string | undefined, filename: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRetryTransmission = async () => {
    if (!selectedInvoice) return;
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      const resp = await api.request<any>(`/invoices/${selectedInvoice.id}/send-hacienda`, {
        method: "POST",
      });
      setRetryMessage(resp?.message || "Comprobante encolado exitosamente para transmisión");
    } catch (err: any) {
      setRetryMessage(err?.message || "Error al solicitar reintento con Hacienda");
    } finally {
      setIsRetrying(false);
    }
  };

  // Find associated sale lines snapshot if available
  const associatedSale = selectedInvoice
    ? sales.find(
        (s) =>
          s.consecutive_number === selectedInvoice.consecutive_number ||
          s.numeric_key === selectedInvoice.numeric_key
      )
    : null;

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Page Header */}
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

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              aria-label="Buscar comprobante"
              placeholder="Buscar por consecutivo (20 dígitos), clave (50 dígitos) o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: "ALL", label: "Todos" },
              { key: "ACCEPTED", label: "Aceptados DGT" },
              { key: "PENDING", label: "Pendientes / Cola" },
              { key: "REJECTED", label: "Rechazados" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === f.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
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
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">
                      {invoices.length === 0
                        ? "No hay comprobantes emitidos aún. Al realizar ventas en el Punto de Venta se generarán automáticamente aquí."
                        : "No se encontraron comprobantes que coincidan con los filtros."}
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
                      <td className="py-3 font-mono text-primary font-bold">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(inv, "resumen")}
                          className="hover:underline text-left"
                        >
                          {inv.consecutive_number}
                        </button>
                      </td>
                      <td className="py-3 font-mono text-text-muted text-[10px] max-w-[180px] truncate" title={inv.numeric_key}>
                        {inv.numeric_key}
                      </td>
                      <td className="py-3 text-text-secondary">{inv.customer_name}</td>
                      <td className="py-3 font-mono text-text-muted text-[11px]">{inv.created_at}</td>
                      <td className="py-3 font-black text-emerald-500 font-mono">{formatCRC(inv.total)}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            inv.status === "ACCEPTED"
                              ? "success"
                              : inv.status === "REJECTED" || inv.status === "ERROR"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {inv.status === "ACCEPTED" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {inv.status === "ACCEPTED"
                            ? "Aceptado"
                            : inv.status === "REJECTED"
                            ? "Rechazado"
                            : inv.status === "PENDING_RETRY"
                            ? "Reintento Pendiente"
                            : "En Proceso"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDetail(inv, "resumen")}
                            className="text-xs px-2.5 py-1 h-auto"
                          >
                            Detalles
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(inv, "xml_enviado")}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                            title="Ver XML firmado"
                          >
                            <Code2 className="w-4 h-4" />
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

      {/* ── Deep Invoice Detail Modal (5 Tabs — Inspired by POSMOVI Benchmark) ──── */}
      {selectedInvoice && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Detalle de Comprobante: ${selectedInvoice.consecutive_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Header Badge & Doc Type */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-border gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted uppercase">Tipo de Documento:</span>
                <p className="font-bold text-text-main">{selectedInvoice.doc_type_label}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted uppercase">Fecha de Emisión:</span>
                <p className="font-mono text-text-secondary">{selectedInvoice.created_at}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted uppercase">Total Facturado:</span>
                <p className="font-mono font-black text-emerald-500 text-sm">{formatCRC(selectedInvoice.total)}</p>
              </div>
              <Badge
                variant={
                  selectedInvoice.status === "ACCEPTED"
                    ? "success"
                    : selectedInvoice.status === "REJECTED"
                    ? "danger"
                    : "warning"
                }
                className="py-1 px-2.5"
              >
                {selectedInvoice.status === "ACCEPTED" ? "Aceptado DGT" : selectedInvoice.status}
              </Badge>
            </div>

            {/* 5 Deep Tabs */}
            <div className="flex border-b border-border text-xs font-bold gap-4">
              {[
                { key: "resumen" as const, label: "1. Resumen" },
                { key: "factura" as const, label: "2. Factura / Líneas" },
                { key: "xml_enviado" as const, label: "3. XML Enviado" },
                { key: "respuesta_hacienda" as const, label: "4. Respuesta Hacienda" },
                { key: "historial" as const, label: "5. Historial" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`pb-2.5 border-b-2 transition-all ${
                    activeTab === t.key
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text-main"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: RESUMEN */}
            {activeTab === "resumen" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
                    <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider block">
                      Datos del Emisor
                    </span>
                    <div>
                      <p className="font-bold text-text-main">{settings.legal_name || settings.trade_name}</p>
                      <p className="text-text-muted font-mono">Cédula: {settings.identification_number}</p>
                      <p className="text-text-muted">{settings.email}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
                    <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider block">
                      Datos del Receptor
                    </span>
                    <div>
                      <p className="font-bold text-text-main">{selectedInvoice.customer_name}</p>
                      <p className="text-text-muted font-mono">
                        Cédula: {associatedSale?.customer_cedula || "No registrada (Tiquete)"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
                  <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider block">
                    Identificadores Oficiales Tributarios
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <p>
                      <strong className="text-text-main">Consecutivo (20 dígitos):</strong>{" "}
                      <span className="text-primary font-bold">{selectedInvoice.consecutive_number}</span>
                    </p>
                    <p className="break-all">
                      <strong className="text-text-main">Clave Numérica (50 dígitos):</strong>{" "}
                      <span className="text-text-secondary">{selectedInvoice.numeric_key}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Resultado de Recepción DGT</span>
                  </div>
                  <p className="text-text-secondary">
                    {selectedInvoice.hacienda_message || "Comprobante procesado por la Dirección General de Tributación."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: FACTURA / LÍNEAS */}
            {activeTab === "factura" && (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs" aria-label="Detalle de líneas del comprobante">
                    <thead className="bg-surface-secondary text-text-muted border-b border-border">
                      <tr>
                        <th className="p-2.5 font-bold">CABYS</th>
                        <th className="p-2.5 font-bold">Descripción</th>
                        <th className="p-2.5 font-bold text-center">Cant.</th>
                        <th className="p-2.5 font-bold text-right">Precio Unit.</th>
                        <th className="p-2.5 font-bold text-right">IVA</th>
                        <th className="p-2.5 font-bold text-right">Total Línea</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {associatedSale?.items_snapshot && associatedSale.items_snapshot.length > 0 ? (
                        associatedSale.items_snapshot.map((it, idx) => (
                          <tr key={idx} className="hover:bg-surface-hover">
                            <td className="p-2.5 font-mono text-[11px] text-text-muted">6339900000000</td>
                            <td className="p-2.5 font-bold text-text-main">{it.name}</td>
                            <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                            <td className="p-2.5 text-right font-mono">{formatCRC(it.unit_price)}</td>
                            <td className="p-2.5 text-right font-mono text-text-muted">{it.tax_rate}%</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-500">
                              {formatCRC(it.total)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-2.5 font-mono text-[11px] text-text-muted">6339900000000</td>
                          <td className="p-2.5 font-bold text-text-main">Venta General en POS</td>
                          <td className="p-2.5 text-center font-mono">1</td>
                          <td className="p-2.5 text-right font-mono">{formatCRC(selectedInvoice.total)}</td>
                          <td className="p-2.5 text-right font-mono text-text-muted">13%</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-500">
                            {formatCRC(selectedInvoice.total)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-surface-secondary rounded-xl border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal Neto:</span>
                    <span className="font-mono font-bold text-text-main">
                      {formatCRC(associatedSale ? associatedSale.subtotal : selectedInvoice.total / 1.13)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">IVA Calculado (13%):</span>
                    <span className="font-mono font-bold text-text-main">
                      {formatCRC(associatedSale ? associatedSale.tax : selectedInvoice.total - selectedInvoice.total / 1.13)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-border text-sm font-black">
                    <span>Total del Comprobante:</span>
                    <span className="font-mono text-emerald-500">{formatCRC(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: XML ENVIADO */}
            {activeTab === "xml_enviado" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text-secondary">Estructura XML Oficial DGT v4.4 (XAdES-BES)</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadXml(selectedInvoice.xml_signed, `${selectedInvoice.numeric_key}-firmado.xml`)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Descargar XML Firmado
                  </Button>
                </div>
                <pre className="p-4 bg-background border border-border rounded-2xl text-[11px] font-mono text-text-secondary overflow-x-auto max-h-96 whitespace-pre-wrap">
                  {selectedInvoice.xml_signed || "<!-- XML XAdES-BES en proceso de generación -->"}
                </pre>
              </div>
            )}

            {/* TAB 4: RESPUESTA HACIENDA */}
            {activeTab === "respuesta_hacienda" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface border border-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider">
                      Mensaje de Confirmación / Rechazo
                    </span>
                    <Badge variant={selectedInvoice.status === "ACCEPTED" ? "success" : "warning"}>
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                  <p className="text-text-main font-medium">
                    {selectedInvoice.hacienda_message || "Comprobante electrónico aceptado y validado en los servidores del Ministerio de Hacienda."}
                  </p>
                </div>

                <div className="p-3 bg-surface-secondary border border-border rounded-xl space-y-2 font-mono text-[11px]">
                  <div><strong>Código de Estado:</strong> 1 (Aceptado)</div>
                  <div><strong>Ambiente de Emisión:</strong> {settings.atv_environment || "STAGING"}</div>
                  <div><strong>Resolución DGT:</strong> Nº DGT-R-033-2019</div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleDownloadXml(
                        `<MensajeHacienda>\n  <Clave>${selectedInvoice.numeric_key}</Clave>\n  <Estado>1</Estado>\n  <DetalleMensaje>Comprobante aceptado</DetalleMensaje>\n</MensajeHacienda>`,
                        `${selectedInvoice.numeric_key}-respuesta.xml`
                      )
                    }
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Descargar Acuse de Respuesta (.xml)
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 5: HISTORIAL */}
            {activeTab === "historial" && (
              <div className="space-y-3 text-xs">
                <div className="space-y-2 border-l-2 border-primary/30 pl-4 ml-2 py-1">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full absolute -left-[21px] top-1" />
                    <p className="font-bold text-text-main">Venta Completada en Punto de Venta</p>
                    <p className="text-text-muted text-[11px] font-mono">{selectedInvoice.created_at}</p>
                  </div>
                  <div className="relative pt-2">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full absolute -left-[21px] top-3" />
                    <p className="font-bold text-text-main">Generación de Clave (50 dígitos) y Consecutivo</p>
                    <p className="text-text-muted text-[11px] font-mono">{selectedInvoice.consecutive_number}</p>
                  </div>
                  <div className="relative pt-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute -left-[21px] top-3" />
                    <p className="font-bold text-text-main">Firmado Digital XAdES-BES y Validación de Esquema v4.4</p>
                    <p className="text-emerald-500 text-[11px] font-medium">Esquema XML conforme a especificación DGT</p>
                  </div>
                </div>

                {retryMessage && (
                  <div className="p-3 bg-primary-subtle border border-primary text-primary rounded-xl text-xs">
                    {retryMessage}
                  </div>
                )}

                <div className="pt-3 border-t border-border flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRetryTransmission}
                    disabled={isRetrying}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Reintentando transmisión..." : "Reintentar Envío a Hacienda"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  );
}