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
import { useStore } from "@/features/store/store-context";
import { PurchaseRecord } from "@/types";
import { api } from "@/lib/api-client";

export default function PurchasesPage() {
  const { purchases, suppliers, products, branches, recordPurchase, settings } = useStore();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  const openCreateModal = () => {
    setSaveError(null);
    setSupplierName(suppliers[0]?.name || "");
    setInvoiceNumber(`FAC-${Date.now().toString().slice(-6)}`);
    setPaymentType("CONTADO");
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setProductName(products[0].name);
      setUnitCost((products[0].cost_price || 0).toString());
    } else {
      setSelectedProductId("");
      setProductName("");
      setUnitCost("");
    }
    setQuantity("1");
    setIsModalOpen(true);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const prod = products.find((p) => p.id === selectedProductId);
    const pName = prod ? prod.name : productName || "Producto Comprado";
    const foundSupplier = suppliers.find((s) => s.name.toLowerCase() === supplierName.trim().toLowerCase());

    const invNum = invoiceNumber.trim() || `FAC-${Date.now().toString().slice(-6)}`;
    const qty = parseFloat(quantity) || 1;
    const cost = parseFloat(unitCost) || (prod ? prod.cost_price : 0);

    try {
      if (prod && branches.length > 0) {
        await api.request("/purchases", {
          method: "POST",
          body: {
            branch_id: branches[0].id,
            supplier_id: foundSupplier?.id || undefined,
            invoice_number: invNum,
            payment_type: paymentType,
            items: [
              {
                product_id: prod.id,
                quantity: qty,
                unit_cost: cost,
              },
            ],
          },
        });
      }

      recordPurchase({
        supplierName: supplierName.trim() || "Proveedor General",
        invoiceNumber: invNum,
        paymentType,
        items: [
          {
            productId: prod?.id,
            productName: pName,
            quantity: qty,
            unitCost: cost,
          },
        ],
      });

      setIsModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || "Error al registrar la compra en el servidor");
    } finally {
      setIsSaving(false);
    }
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
            <h1 className="text-xl font-bold text-text-main tracking-tight">Facturas de Compra y Recepción ({purchases.length})</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Ingreso de mercadería, costos unitarios y crédito de proveedores
            </p>
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Compra
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar compra por proveedor o factura"
            placeholder="Buscar por proveedor o número de factura de compra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Purchases Table or Clean Empty State */}
        {purchases.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <PackagePlus className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">No se han registrado compras de mercadería</h2>
              <p className="text-xs text-text-muted">
                Registra las facturas de compra de tus distribuidores para alimentar el stock del inventario y controlar tus costos.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Primera Compra
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de compras">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Nº Factura Proveedor</th>
                    <th scope="col" className="pb-3 font-bold">Proveedor</th>
                    <th scope="col" className="pb-3 font-bold">Condición</th>
                    <th scope="col" className="pb-3 font-bold">Fecha Recepción</th>
                    <th scope="col" className="pb-3 font-bold">Unidades</th>
                    <th scope="col" className="pb-3 font-bold">Total (CRC)</th>
                    <th scope="col" className="pb-3 font-bold text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-mono font-bold text-primary">{p.invoice_number}</td>
                      <td className="py-3 font-bold text-text-main flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-text-muted" />
                        <span>{p.supplier_name}</span>
                      </td>
                      <td className="py-3">
                        <Badge variant={p.payment_type === "CONTADO" ? "success" : "default"}>
                          {p.payment_type}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-text-muted text-[11px]">{p.created_at}</td>
                      <td className="py-3 font-mono text-text-secondary">{p.items_count} uds</td>
                      <td className="py-3 font-black text-emerald-500 font-mono text-sm">{formatCRC(p.total_amount)}</td>
                      <td className="py-3 text-right">
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Recibido
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal Registrar Compra */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Factura de Compra / Entrada de Stock"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Proveedor
              </label>
              {suppliers.length > 0 ? (
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="Ej: Distribuidora La Florida"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              )}
            </div>

            <Input
              label="Número de Factura"
              placeholder="FAC-12345"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Producto a Recibir en Stock
            </label>
            {products.length > 0 ? (
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((pr) => pr.id === e.target.value);
                  if (p) setUnitCost(p.cost_price.toString());
                }}
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Nombre del Producto a ingresar"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Cantidad de Unidades"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <Input
              label="Costo Unitario (CRC ₡)"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Condición de Pago
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="CONTADO">Contado (Efectivo / Transferencia)</option>
              <option value="CREDITO">Crédito Comercial (30 días)</option>
            </select>
          </div>

          {saveError && (
            <p className="text-xs text-semantic-danger-text font-bold">{saveError}</p>
          )}

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Procesar Entrada de Mercadería"}
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}