"use client";

import React, { useState } from "react";
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  FileText,
  Plus,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

interface MovementRecord {
  id: string;
  created_at: string;
  product_name: string;
  movement_type: "IN_PURCHASE" | "OUT_SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "WASTE";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  actor_name: string;
  reason?: string;
}

const DEMO_MOVEMENTS: MovementRecord[] = [
  { id: "1", created_at: "2026-08-29 08:30", product_name: "Coca-Cola 600ml Descartable", movement_type: "OUT_SALE", quantity: -2, previous_quantity: 52, new_quantity: 50, actor_name: "Cajero Principal", reason: "Venta en POS #V-000012" },
  { id: "2", created_at: "2026-08-29 07:15", product_name: "Cerveza Imperial 350ml Lata", movement_type: "IN_PURCHASE", quantity: 24, previous_quantity: 21, new_quantity: 45, actor_name: "Carlos Propietario", reason: "Factura de Compra #9921 FIFCO" },
  { id: "3", created_at: "2026-08-28 16:45", product_name: "Galletas Chiky Chocolate", movement_type: "WASTE", quantity: -5, previous_quantity: 10, new_quantity: 5, actor_name: "Carlos Propietario", reason: "Empaque dañado durante descarga" },
  { id: "4", created_at: "2026-08-28 14:10", product_name: "Café Rey 500g Tradicional", movement_type: "RETURN_IN", quantity: 1, previous_quantity: 19, new_quantity: 20, actor_name: "Cajero Principal", reason: "Devolución de cliente por compra equivocada" },
];

export default function InventoryPage() {
  const [movements, setMovements] = useState<MovementRecord[]>(DEMO_MOVEMENTS);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjProduct, setAdjProduct] = useState("Coca-Cola 600ml Descartable");
  const [adjType, setAdjType] = useState<string>("IN_PURCHASE");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(adjQty) || 0;
    const isNegative = adjType === "WASTE" || adjType === "ADJUSTMENT_OUT";
    const delta = isNegative ? -Math.abs(qty) : Math.abs(qty);

    const newMov: MovementRecord = {
      id: Date.now().toString(),
      created_at: new Date().toISOString().replace("T", " ").substring(0, 16),
      product_name: adjProduct,
      movement_type: adjType as any,
      quantity: delta,
      previous_quantity: 50,
      new_quantity: 50 + delta,
      actor_name: "Carlos Propietario",
      reason: adjReason,
    };

    setMovements([newMov, ...movements]);
    setIsAdjustModalOpen(false);
    setAdjQty("");
    setAdjReason("");
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "IN_PURCHASE":
        return <Badge variant="success">Entrada por Compra</Badge>;
      case "OUT_SALE":
        return <Badge variant="blue">Venta POS</Badge>;
      case "RETURN_IN":
        return <Badge variant="success">Devolución Cliente</Badge>;
      case "WASTE":
        return <Badge variant="danger">Merma / Dañado</Badge>;
      default:
        return <Badge variant="default">Ajuste Manual</Badge>;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Libro Mayor de Inventario (Ledger)</h1>
            <p className="text-xs text-[#8E929E]">Historial inmutable de movimientos, compras, ventas y mermas</p>
          </div>
          <Button variant="primary" onClick={() => setIsAdjustModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajustar Stock / Entrada
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#0EA5FF]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Movimientos Registrados</span>
              <Boxes className="w-4 h-4 text-[#0EA5FF]" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white">{movements.length}</span>
              <span className="text-[11px] text-[#8E929E] block">Trazabilidad en tiempo real</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Artículos Bajo Mínimo</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-400">1 Producto</span>
              <span className="text-[11px] text-[#8E929E] block">Galletas Chiky (5 uds restantes)</span>
            </div>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E929E] font-medium uppercase">Integridad del Ledger</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-400">100% Auditado</span>
              <span className="text-[11px] text-[#8E929E] block">Cero registros destructivos</span>
            </div>
          </Card>
        </div>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Historial de Movimientos de Inventario</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8E929E] border-b border-[#26282E]">
                  <th className="pb-3">Fecha / Hora</th>
                  <th className="pb-3">Producto</th>
                  <th className="pb-3">Tipo de Movimiento</th>
                  <th className="pb-3 text-right">Variación</th>
                  <th className="pb-3 text-right">Stock Anterior</th>
                  <th className="pb-3 text-right">Nuevo Stock</th>
                  <th className="pb-3">Responsable</th>
                  <th className="pb-3">Motivo / Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-mono text-[#8E929E]">{m.created_at}</td>
                    <td className="py-3 font-semibold text-white">{m.product_name}</td>
                    <td className="py-3">{getMovementBadge(m.movement_type)}</td>
                    <td className="py-3 text-right font-mono font-bold">
                      <span className={m.quantity > 0 ? "text-emerald-400" : "text-red-400"}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[#8E929E]">{m.previous_quantity}</td>
                    <td className="py-3 text-right font-mono font-bold text-white">{m.new_quantity}</td>
                    <td className="py-3 text-[#CFCFD4]">{m.actor_name}</td>
                    <td className="py-3 text-[11px] text-[#8E929E] italic">{m.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Registrar Movimiento de Inventario" maxWidth="md">
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CFCFD4]">Producto</label>
            <select
              value={adjProduct}
              onChange={(e) => setAdjProduct(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]"
            >
              <option value="Coca-Cola 600ml Descartable">Coca-Cola 600ml Descartable</option>
              <option value="Cerveza Imperial 350ml Lata">Cerveza Imperial 350ml Lata</option>
              <option value="Papas Tosty Clásicas 115g">Papas Tosty Clásicas 115g</option>
              <option value="Café Rey 500g Tradicional">Café Rey 500g Tradicional</option>
              <option value="Galletas Chiky Chocolate">Galletas Chiky Chocolate</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CFCFD4]">Tipo de Movimiento</label>
            <select
              value={adjType}
              onChange={(e) => setAdjType(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]"
            >
              <option value="IN_PURCHASE">Entrada por Compra / Factura Proveedor (+)</option>
              <option value="ADJUSTMENT_IN">Ajuste Positivo / Conteo (+)</option>
              <option value="ADJUSTMENT_OUT">Ajuste Negativo (-)</option>
              <option value="WASTE">Merma / Vencimiento / Producto Dañado (-)</option>
            </select>
          </div>

          <Input
            label="Cantidad de Unidades"
            type="number"
            placeholder="Ej: 24"
            value={adjQty}
            onChange={(e) => setAdjQty(e.target.value)}
            required
          />

          <Input
            label="Motivo o Referencia Obligatoria"
            placeholder="Ej: Factura Proveedor #5544 o Conteo físico semanal"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            required
          />

          <div className="pt-3 border-t border-[#26282E] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Aplicar Movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}