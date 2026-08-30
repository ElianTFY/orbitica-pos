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

interface InvoiceRecord {
  id: string;
  doc_type: "01" | "04" | "03";
  doc_type_label: string;
  consecutive_number: string;
  numeric_key: string;
  created_at: string;
  status: "ACCEPTED" | "PENDING" | "REJECTED";
  hacienda_message?: string;
  xml_signed?: string;
}

const DEMO_INVOICES: InvoiceRecord[] = [
  {
    id: "1",
    doc_type: "04",
    doc_type_label: "Tiquete Electrónico (04)",
    consecutive_number: "00100001040000000012",
    numeric_key: "50629082600310188899900100001040000000012112345678",
    created_at: "2026-08-30 08:30",
    status: "ACCEPTED",
    hacienda_message: "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.3",
    xml_signed: `<?xml version="1.0" encoding="utf-8"?>\n<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/tiqueteElectronico">\n  <Clave>50629082600310188899900100001040000000012112345678</Clave>\n  <NumeroConsecutivo>00100001040000000012</NumeroConsecutivo>\n  <FechaEmision>2026-08-30T08:30:00-06:00</FechaEmision>\n  <Emisor>\n    <Nombre>Comercial San José S.A.</Nombre>\n    <Identificacion><Tipo>02</Tipo><Numero>3101888999</Numero></Identificacion>\n  </Emisor>\n  <ResumenFactura>\n    <CodigoTipoMoneda>CRC</CodigoTipoMoneda>\n    <TotalComprobante>2400.00</TotalComprobante>\n  </ResumenFactura>\n  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature-d78a1f">\n    <ds:SignedInfo>\n      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>\n      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>\n      <ds:Reference URI=""><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>nK3...=</ds:DigestValue></ds:Reference>\n    </ds:SignedInfo>\n    <ds:SignatureValue>aW89...==</ds:SignatureValue>\n  </ds:Signature>\n</TiqueteElectronico>`
  },
  {
    id: "2",
    doc_type: "01",
    doc_type_label: "Factura Electrónica (01)",
    consecutive_number: "00100001010000000008",
    numeric_key: "50629082600310188899900100001010000000008187654321",
    created_at: "2026-08-30 08:15",
    status: "ACCEPTED",
    hacienda_message: "Comprobante electrónico aceptado exitosamente por Ministerio de Hacienda CR v4.3",
    xml_signed: `<?xml version="1.0" encoding="utf-8"?>\n<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica">\n  <Clave>50629082600310188899900100001010000000008187654321</Clave>\n  <NumeroConsecutivo>00100001010000000008</NumeroConsecutivo>\n  <Emisor><Nombre>Comercial San José S.A.</Nombre></Emisor>\n</FacturaElectronica>`
  },
  {
    id: "3",
    doc_type: "04",
    doc_type_label: "Tiquete Electrónico (04)",
    consecutive_number: "00100001040000000013",
    numeric_key: "50629082600310188899900100001040000000013199887766",
    created_at: "2026-08-30 07:50",
    status: "PENDING",
    hacienda_message: "Firmado con XAdES-BES. Listo para transmitir a Hacienda",
  },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(DEMO_INVOICES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.numeric_key.includes(searchQuery) ||
      inv.consecutive_number.includes(searchQuery) ||
      inv.doc_type_label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTransmit = (invId: string) => {
    setIsTransmitting(invId);
    setTimeout(() => {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invId
            ? {
                ...i,
                status: "ACCEPTED",
                hacienda_message: "Comprobante firmado con XAdES-BES y aceptado por Hacienda ATV (v4.3)",
              }
            : i
        )
      );
      setIsTransmitting(null);
    }, 1200);
  };

  const handleViewXml = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setIsXmlModalOpen(true);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Facturación Electrónica Hacienda (v4.3)</h1>
            <p className="text-xs text-[#8E929E]">Firma digital XAdES-BES, transmisión y monitoreo de acuses con el Ministerio de Hacienda</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="py-1 px-3">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              API ATV CONECTADO
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Aceptadas por Hacienda</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-400">
                {invoices.filter((i) => i.status === "ACCEPTED").length}
              </span>
              <span className="text-[11px] text-[#8E929E] block">Con firma XAdES-BES válida</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">En Cola / Pendientes</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-400">
                {invoices.filter((i) => i.status === "PENDING").length}
              </span>
              <span className="text-[11px] text-[#8E929E] block">Listas para despacho automático</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Normativa Tributaria</span>
              <ShieldCheck className="w-4 h-4 text-[#0EA5FF]" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">v4.3</span>
              <span className="text-[11px] text-[#8E929E] block">Res. DGT-R-48-2016 Costa Rica</span>
            </div>
          </Card>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Buscar por clave numérica (50 dígitos), consecutivo o tipo de documento..."
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
                  <th className="pb-3">Clave Numérica de Hacienda (50 dígitos)</th>
                  <th className="pb-3">Fecha Emisión</th>
                  <th className="pb-3 text-center">Estado Hacienda</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-semibold text-white">{inv.doc_type_label}</td>
                    <td className="py-3 font-mono text-[#0EA5FF] font-bold">{inv.consecutive_number}</td>
                    <td className="py-3 font-mono text-[11px] text-[#8E929E] max-w-xs truncate">{inv.numeric_key}</td>
                    <td className="py-3 font-mono text-[#8E929E]">{inv.created_at}</td>
                    <td className="py-3 text-center">
                      <Badge variant={inv.status === "ACCEPTED" ? "success" : inv.status === "PENDING" ? "warning" : "danger"}>
                        {inv.status === "ACCEPTED" ? "Aceptada" : inv.status === "PENDING" ? "Pendiente Envío" : "Rechazada"}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => handleViewXml(inv)}>
                          <Code2 className="w-3.5 h-3.5 mr-1" />
                          XML
                        </Button>
                        {inv.status === "PENDING" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleTransmit(inv.id)}
                            disabled={isTransmitting === inv.id}
                          >
                            {isTransmitting === inv.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 mr-1" />
                            )}
                            Transmitir
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

      {selectedInvoice && (
        <Modal
          isOpen={isXmlModalOpen}
          onClose={() => setIsXmlModalOpen(false)}
          title={`XML Oficial Firmado (${selectedInvoice.consecutive_number})`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#141518] rounded-xl border border-[#26282E] text-xs space-y-1 font-mono">
              <div><span className="text-[#8E929E]">Clave:</span> <span className="text-[#0EA5FF] break-all">{selectedInvoice.numeric_key}</span></div>
              <div><span className="text-[#8E929E]">Estado:</span> <span className="text-emerald-400 font-bold">Aceptado por Hacienda</span></div>
            </div>

            <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#26282E] overflow-x-auto max-h-80 font-mono text-[11px] text-[#0EA5FF] leading-relaxed">
              <pre>{selectedInvoice.xml_signed || `<?xml version="1.0" encoding="utf-8"?>\n<TiqueteElectronico xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/tiqueteElectronico">\n  <Clave>${selectedInvoice.numeric_key}</Clave>\n  <NumeroConsecutivo>${selectedInvoice.consecutive_number}</NumeroConsecutivo>\n</TiqueteElectronico>`}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsXmlModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  );
}