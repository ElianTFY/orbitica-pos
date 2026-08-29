"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  Send,
  ShieldCheck,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

interface InvoiceRecord {
  id: string;
  doc_type: "01" | "04" | "03";
  doc_type_label: string;
  consecutive_number: string;
  numeric_key: string;
  created_at: string;
  status: "ACCEPTED" | "PENDING" | "REJECTED";
  hacienda_message?: string;
}

const DEMO_INVOICES: InvoiceRecord[] = [
  {
    id: "1",
    doc_type: "04",
    doc_type_label: "Tiquete Electrónico (04)",
    consecutive_number: "00100001040000000012",
    numeric_key: "50629082600310188899900100001040000000012112345678",
    created_at: "2026-08-29 08:30",
    status: "ACCEPTED",
    hacienda_message: "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.3",
  },
  {
    id: "2",
    doc_type: "01",
    doc_type_label: "Factura Electrónica (01)",
    consecutive_number: "00100001010000000008",
    numeric_key: "50629082600310188899900100001010000000008187654321",
    created_at: "2026-08-29 08:15",
    status: "ACCEPTED",
    hacienda_message: "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.3",
  },
  {
    id: "3",
    doc_type: "04",
    doc_type_label: "Tiquete Electrónico (04)",
    consecutive_number: "00100001040000000013",
    numeric_key: "50629082600310188899900100001040000000013199887766",
    created_at: "2026-08-29 07:50",
    status: "PENDING",
    hacienda_message: "En cola de procesamiento asíncrono para Hacienda",
  },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(DEMO_INVOICES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.numeric_key.includes(searchQuery) ||
      inv.consecutive_number.includes(searchQuery)
  );

  const simulateSendHacienda = (id: string) => {
    setInvoices(
      invoices.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              status: "ACCEPTED",
              hacienda_message: "Comprobante procesado y aceptado por Ministerio de Hacienda v4.3",
            }
          : inv
      )
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <Badge variant="success">Aceptado por Hacienda</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pendiente de Envío</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Rechazado</Badge>;
      default:
        return <Badge variant="default">Borrador</Badge>;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Facturación Electrónica (Hacienda Costa Rica v4.3)</h1>
            <p className="text-xs text-[#8E929E]">Monitoreo de comprobantes fiscales, claves numéricas de 50 dígitos y acuses</p>
          </div>
          <Badge variant="blue" className="bg-[#0EA5FF]/10 text-[#0EA5FF] border-[#0EA5FF]/30">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            HACIENDA v4.3 COMPLIANT
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Comprobantes Aceptados</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-400">2</span>
              <span className="text-[11px] text-[#8E929E] block">Acuse 100% verificado</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Pendientes / Cola</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-400">1</span>
              <span className="text-[11px] text-[#8E929E] block">En proceso de firma</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Desacoplamiento POS</span>
              <FileText className="w-4 h-4 text-[#0EA5FF]" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">Activo</span>
              <span className="text-[11px] text-[#8E929E] block">Ventas no bloquean por red</span>
            </div>
          </Card>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Buscar por clave numérica (50 dígitos) o consecutivo (20 dígitos)..."
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
                  <th className="pb-3">Tipo Documento</th>
                  <th className="pb-3">Consecutivo (20 dígitos)</th>
                  <th className="pb-3">Clave Numérica (50 dígitos)</th>
                  <th className="pb-3">Fecha / Hora</th>
                  <th className="pb-3 text-center">Estado Hacienda</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-semibold text-white">{inv.doc_type_label}</td>
                    <td className="py-3 font-mono font-bold text-[#0EA5FF]">{inv.consecutive_number}</td>
                    <td className="py-3 font-mono text-[11px] text-[#8E929E] max-w-xs truncate" title={inv.numeric_key}>
                      {inv.numeric_key}
                    </td>
                    <td className="py-3 font-mono text-[#8E929E]">{inv.created_at}</td>
                    <td className="py-3 text-center">{getStatusBadge(inv.status)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === "PENDING" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => simulateSendHacienda(inv.id)}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Enviar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Ver Detalle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedInvoice && (
        <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalle Comprobante Hacienda" maxWidth="lg">
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-[#1A1B1F] border border-[#26282E] rounded-xl space-y-3">
              <div>
                <span className="text-[#8E929E] block text-[10px] uppercase font-semibold">Clave Numérica Oficial (50 dígitos)</span>
                <span className="font-mono text-white text-xs break-all block mt-0.5">{selectedInvoice.numeric_key}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#8E929E] block text-[10px] uppercase">Número Consecutivo</span>
                  <span className="font-mono text-[#0EA5FF] font-bold">{selectedInvoice.consecutive_number}</span>
                </div>
                <div>
                  <span className="text-[#8E929E] block text-[10px] uppercase">Tipo de Documento</span>
                  <span className="text-white font-medium">{selectedInvoice.doc_type_label}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#1A1B1F] border border-[#26282E] rounded-xl space-y-1.5">
              <span className="text-[#8E929E] block text-[10px] uppercase font-semibold">Respuesta del Ministerio de Hacienda</span>
              <p className="text-white font-medium">{selectedInvoice.hacienda_message}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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