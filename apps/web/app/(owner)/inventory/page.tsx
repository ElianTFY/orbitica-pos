"use client";

import React, { useState } from "react";
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Package,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";

export default function InventoryPage() {
  const { movements, products, recordAdjustment, settings } = useStore();
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjType, setAdjType] = useState<"IN_PURCHASE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "WASTE">("ADJUSTMENT_IN");
  const [adjQty, setAdjQty] = useState("10");
  const [adjReason, setAdjReason] = useState("");

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId) || products[0];
    if (!prod) return;

    const qty = parseFloat(adjQty) || 0;
    const isNegative = adjType === "WASTE" || adjType === "ADJUSTMENT_OUT";
    const delta = isNegative ? -Math.abs(qty) : Math.abs(qty);

    recordAdjustment({
      productId: prod.id,
      productName: prod.name,
      movementType: adjType,
      quantity: delta,
      reason: adjReason,
    });

    setIsAdjustModalOpen(false);
    setAdjQty("10");
    setAdjReason("");
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "IN_PURCHASE":
      case "ADJUSTMENT_IN":
      case "RETURN_IN":
        return "success";
      case "OUT_SALE":
        return "blue";
      case "WASTE":
      case "ADJUSTMENT_OUT":
        return "danger";
      default:
        return "default";
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "IN_PURCHASE": return "Entrada (Compra)";
      case "ADJUSTMENT_IN": return "Ajuste Entrada (+)";
      case "RETURN_IN": return "Devolución Cliente (+)";
      case "OUT_SALE": return "Salida (Venta POS)";
      case "ADJUSTMENT_OUT": return "Ajuste Salida (-)";
      case "WASTE": return "Merma / Daño (-)";
      default: return type;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Kárdex y Movimientos de Inventario</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Trazabilidad de entradas, salidas por venta, mermas y ajustes manuales
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              if (products.length > 0) {
                setSelectedProductId(products[0].id);
              }
              setIsAdjustModalOpen(true);
            }}
            disabled={products.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Ajuste / Entrada
          </Button>
        </div>

        {/* Movements Table or Clean Empty State */}
        {movements.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Boxes className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">El inventario aún no tiene movimientos</h2>
              <p className="text-xs text-text-muted">
                {products.length === 0
                  ? "Crea productos en el catálogo para comenzar a registrar entradas de mercadería y salidas por ventas."
                  : "Los movimientos se generarán automáticamente cuando realices compras o ventas en caja."}
              </p>
            </div>
            {products.length > 0 && (
              <Button variant="primary" onClick={() => setIsAdjustModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Primer Ajuste
              </Button>
            )}
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de kárdex de inventario">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Fecha / Hora</th>
                    <th scope="col" className="pb-3 font-bold">Producto</th>
                    <th scope="col" className="pb-3 font-bold">Tipo de Movimiento</th>
                    <th scope="col" className="pb-3 font-bold">Cantidad</th>
                    <th scope="col" className="pb-3 font-bold">Stock Resultante</th>
                    <th scope="col" className="pb-3 font-bold">Responsable / Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-mono text-text-muted text-[11px]">{m.created_at}</td>
                      <td className="py-3 font-bold text-text-main flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate max-w-xs">{m.product_name}</span>
                      </td>
                      <td className="py-3">
                        <Badge variant={getBadgeVariant(m.movement_type)}>
                          {getLabel(m.movement_type)}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono font-bold">
                        <span className={m.quantity > 0 ? "text-emerald-500" : "text-semantic-danger-text"}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} uds
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-text-main">{m.new_quantity} uds</td>
                      <td className="py-3 text-text-secondary text-[11px]">
                        <span className="font-bold text-text-main block">{m.actor_name}</span>
                        <span className="text-text-muted">{m.reason || "Sin detalle"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Adjust Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Ajuste Manual de Inventario / Entrada"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Producto a Modificar
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock Actual: {p.stock} uds)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Tipo de Ajuste
              </label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="ADJUSTMENT_IN">Ajuste Entrada (+) — Conteo Físico</option>
                <option value="ADJUSTMENT_OUT">Ajuste Salida (-) — Faltante</option>
                <option value="WASTE">Merma / Producto Vencido (-)</option>
                <option value="RETURN_IN">Devolución de Cliente (+)</option>
              </select>
            </div>

            <Input
              label="Cantidad de Unidades"
              type="number"
              value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Input
            label="Motivo o Justificación del Ajuste"
            placeholder="Ej: Cuadre físico semanal de bodega"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Aplicar Ajuste de Stock
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}