"use client";

import React from "react";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCRC } from "@/lib/utils";

export interface ThermalReceiptProps {
  data: {
    sale_number: string;
    created_at: string;
    store: {
      name: string;
      legal_name: string;
      legal_id: string;
      phone: string;
      email: string;
      address: string;
      branch_name: string;
    };
    customer: {
      name: string;
      identification?: string | null;
      email?: string | null;
    };
    hacienda: {
      doc_type: string;
      consecutive: string;
      numeric_key: string;
      resolution: string;
      qr_url: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      tax_amount: number;
      total: number;
    }>;
    totals: {
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      currency: string;
    };
    payments: Array<{
      method: string;
      amount: number;
      reference?: string | null;
    }>;
    footer_message: string;
  };
  onClose?: () => void;
}

export function ThermalReceipt({ data, onClose }: ThermalReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div id="thermal-print-area" className="bg-white text-black p-6 rounded-xl font-mono text-xs max-w-sm mx-auto shadow-2xl border border-gray-200">
        <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
          <h2 className="text-base font-black tracking-tight uppercase">{data.store.name}</h2>
          <p className="text-[10px] text-gray-700">{data.store.legal_name}</p>
          <p className="text-[10px] font-bold">Cédula Jurídica: {data.store.legal_id}</p>
          <p className="text-[10px] text-gray-600">{data.store.address}</p>
          <p className="text-[10px] text-gray-600">Tel: {data.store.phone} | {data.store.branch_name}</p>
        </div>

        <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
          <div className="flex justify-between font-bold text-gray-900">
            <span>{data.hacienda.doc_type}</span>
            <span>{data.sale_number}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase">Consecutivo:</span>
            <span className="font-bold text-[10px] break-all">{data.hacienda.consecutive}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px] uppercase">Clave Numérica (50 dígitos):</span>
            <span className="text-[9px] break-all font-mono leading-tight block">{data.hacienda.numeric_key}</span>
          </div>
          <div className="flex justify-between text-gray-600 pt-0.5">
            <span>Fecha/Hora:</span>
            <span>{data.created_at}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Cliente:</span>
            <span className="font-semibold">{data.customer.name}</span>
          </div>
          {data.customer.identification && (
            <div className="flex justify-between text-gray-600">
              <span>Cédula Cliente:</span>
              <span>{data.customer.identification}</span>
            </div>
          )}
        </div>

        <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold text-gray-700 border-b border-gray-200 pb-1">
            <span>CANT / DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>
          {data.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5 text-[11px]">
              <div className="flex justify-between font-semibold">
                <span className="truncate pr-2">{item.name}</span>
                <span>{formatCRC(item.total)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{item.quantity} x {formatCRC(item.unit_price)}</span>
                <span>(IVA {formatCRC(item.tax_amount)})</span>
              </div>
            </div>
          ))}
        </div>

        <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-xs">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span>{formatCRC(data.totals.subtotal)}</span>
          </div>
          {data.totals.discount > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Descuento:</span>
              <span>-{formatCRC(data.totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span>IVA (13% / 4% / 2% / 1%):</span>
            <span>{formatCRC(data.totals.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-black border-t border-gray-400 pt-1 text-black">
            <span>TOTAL:</span>
            <span>{formatCRC(data.totals.total)}</span>
          </div>
        </div>

        <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
          <span className="font-bold text-gray-700 block text-[10px]">FORMAS DE PAGO:</span>
          {data.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{p.method === "CASH_CRC" ? "Efectivo Colones" : p.method === "SINPE" ? "SINPE Móvil" : p.method === "CARD" ? "Tarjeta Datáfono" : p.method}</span>
              <span className="font-bold">{formatCRC(p.amount)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 text-center space-y-2">
          <div className="flex items-center justify-center">
            <div className="p-2 border border-gray-300 rounded bg-white inline-block">
              <QrCode className="w-16 h-16 text-black" />
            </div>
          </div>
          <p className="text-[9px] text-gray-600 leading-tight">
            {data.hacienda.resolution}
          </p>
          <p className="text-[10px] font-bold text-gray-800 pt-1">
            {data.footer_message}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        )}
        <Button variant="primary" onClick={handlePrint} className="bg-[#0EA5FF] hover:bg-[#0284C7] text-white">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Tiquete Térmico (ESC/POS)
        </Button>
      </div>
    </div>
  );
}