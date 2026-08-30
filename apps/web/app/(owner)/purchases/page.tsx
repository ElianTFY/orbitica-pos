"use client";

import React, { useState } from "react";
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  FileSpreadsheet,
  PackagePlus,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";

interface PurchaseRecord {
  id: string;
  supplier_name: string;
  invoice_number: string;
  payment_type: "CONTADO" | "CREDITO";
  total_amount: number;
  items_count: number;
  created_at: string;
  status: "RECEIVED";
}

const DEMO_PURCHASES: PurchaseRecord[] = [
  { id: "1", supplier_name: "Distribuidora La Florida S.A.", invoice_number: "FAC-9901", payment_type: "CREDITO", total_amount: 145000, items_count: 3, created_at: "2026-08-29 09:30", status: "RECEIVED" },
  { id: "2", supplier_name: "Corporación Dos Pinos R.L.", invoice_number: "FAC-8812", payment_type: "CONTADO", total_amount: 88500, items_count: 5, created_at: "2026-08-28 14:15", status: "RECEIVED" },
  { id: "3", supplier_name: "Coca-Cola FEMSA Costa Rica", invoice_number: "FAC-7734", payment_type: "CONTADO", total_amount: 210000, items_count: 8, created_at: "2026-08-27 10:00", status: "RECEIVED" },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(DEMO_PURCHASES);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [supplierName, setSupplierName] = useState("Distribuidora La Florida S.A.");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("20");
  const [unitCost, setUnitCost] = useState("500");

  const qtyNum = parseFloat(quantity) || 0;
  const costNum = parseFloat(unitCost) || 0;
  const subtotal = qtyNum * costNum;
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const newP: PurchaseRecord = {
      id: Date.now().toString(),
      supplier_name: supplierName,
      invoice_number: invoiceNumber || `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      payment_type: paymentType,
      total_amount: total,
      items_count: 1,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "RECEIVED",
    };
    setPurchases([newP, ...purchases]);
    setIsModalOpen(false);
    setInvoiceNumber("");
    setProductName("");
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Compras a Proveedores e Ingreso de Stock</h1>
            <p className="text-xs text-text-muted">Recepción de facturas de compra y aumento automático de inventario</p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <PackagePlus className="w-4 h-4 mr-2" />
            Registrar Factura de Compra
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Total Compras del Mes</span>
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">{formatCRC(443500)}</span>
              <span className="text-[11px] text-text-muted block">Auto-ingreso a stock</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Facturas Recibidas</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-400">3</span>
              <span className="text-[11px] text-text-muted block">Con asiento en Libro Mayor</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium uppercase">Crédito a Proveedores</span>
              <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-purple-400">{formatCRC(145000)}</span>
              <span className="text-[11px] text-text-muted block">Cuentas por pagar activas</span>
            </div>
          </Card>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por proveedor o número de factura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-primary"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="pb-3">Proveedor</th>
                  <th className="pb-3">Nº Factura Proveedor</th>
                  <th className="pb-3">Condición Pago</th>
                  <th className="pb-3">Fecha Recepción</th>
                  <th className="pb-3 text-center">Estado Stock</th>
                  <th className="pb-3 text-right">Total Facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="py-3 font-semibold text-white">{p.supplier_name}</td>
                    <td className="py-3 font-mono text-primary font-bold">{p.invoice_number}</td>
                    <td className="py-3">
                      <Badge variant={p.payment_type === "CONTADO" ? "success" : "blue"}>{p.payment_type}</Badge>
                    </td>
                    <td className="py-3 font-mono text-text-muted">{p.created_at}</td>
                    <td className="py-3 text-center">
                      <Badge variant="success">Inventariado (+)</Badge>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-white">{formatCRC(p.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Factura de Compra de Proveedor" maxWidth="md">
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Seleccionar Proveedor</label>
            <select
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-xl text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="Distribuidora La Florida S.A.">Distribuidora La Florida S.A. (3-101-112233)</option>
              <option value="Corporación Dos Pinos R.L.">Corporación Dos Pinos R.L. (3-004-045000)</option>
              <option value="Coca-Cola FEMSA Costa Rica">Coca-Cola FEMSA Costa Rica (3-101-098765)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de Factura"
              placeholder="FAC-9902"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Condición de Pago</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-xl text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="CONTADO">Contado (Efectivo/Transferencia)</option>
                <option value="CREDITO">Crédito Comercial</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-surface-secondary border border-border rounded-xl space-y-3">
            <span className="text-[10px] uppercase font-bold text-text-muted block">Detalle del Producto a Ingresar</span>
            <Input
              label="Nombre del Producto"
              placeholder="Ej: Jugo Naranja 500ml"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cantidad Recibida"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <Input
                label="Costo Unitario (CRC sin IVA)"
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-border space-y-1.5 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCRC(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>IVA 13%:</span>
              <span className="font-mono">{formatCRC(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white border-t border-border pt-1">
              <span>Total a Pagar:</span>
              <span className="font-mono text-primary">{formatCRC(total)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar e Incrementar Inventario
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}