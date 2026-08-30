"use client";

import React, { useState } from "react";
import {
  DollarSign,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Smartphone,
  CreditCard,
  Banknote,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";

interface CashSession {
  id: string;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  user_name: string;
  initial_cash_amount: number;
  sales_cash: number;
  sales_sinpe: number;
  sales_card: number;
  expected_cash_amount: number;
}

const DEMO_SESSION: CashSession = {
  id: "session-001",
  status: "OPEN",
  opened_at: "2026-08-29 07:00",
  user_name: "Cajero Principal",
  initial_cash_amount: 30000,
  sales_cash: 58000,
  sales_sinpe: 142000,
  sales_card: 85400,
  expected_cash_amount: 88000,
};

export default function CashRegisterPage() {
  const [session, setSession] = useState<CashSession | null>(DEMO_SESSION);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Form states
  const [openAmount, setOpenAmount] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const initAmount = parseFloat(openAmount) || 0;
    setSession({
      id: Date.now().toString(),
      status: "OPEN",
      opened_at: new Date().toISOString().replace("T", " ").substring(0, 16),
      user_name: "Carlos Propietario",
      initial_cash_amount: initAmount,
      sales_cash: 0,
      sales_sinpe: 0,
      sales_card: 0,
      expected_cash_amount: initAmount,
    });
    setIsOpenModalOpen(false);
    setOpenAmount("");
  };

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSession(null);
    setIsCloseModalOpen(false);
    setActualCash("");
  };

  const actualNum = parseFloat(actualCash) || 0;
  const expectedNum = session ? session.expected_cash_amount : 0;
  const difference = actualNum - expectedNum;

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Control de Caja y Turnos</h1>
            <p className="text-xs text-text-muted">Apertura de turno, arqueo en tiempo real y cierre con reporte de descuadre</p>
          </div>
          <div>
            {session && session.status === "OPEN" ? (
              <Button variant="danger" onClick={() => setIsCloseModalOpen(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Cerrar Turno y Realizar Arqueo
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsOpenModalOpen(true)}>
                <Unlock className="w-4 h-4 mr-2" />
                Abrir Turno de Caja
              </Button>
            )}
          </div>
        </div>

        {session && session.status === "OPEN" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-[#0EA5FF]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium uppercase">Fondo Inicial</span>
                  <Banknote className="w-4 h-4 text-primary" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-white">{formatCRC(session.initial_cash_amount)}</span>
                  <span className="text-[11px] text-text-muted block">Apertura: {session.opened_at}</span>
                </div>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium uppercase">Ventas en Efectivo</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-emerald-400">{formatCRC(session.sales_cash)}</span>
                  <span className="text-[11px] text-text-muted block">Ingresado al cajón</span>
                </div>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium uppercase">SINPE Móvil</span>
                  <Smartphone className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-purple-400">{formatCRC(session.sales_sinpe)}</span>
                  <span className="text-[11px] text-text-muted block">Bancarizado / Electrónico</span>
                </div>
              </Card>

              <Card className="border-l-4 border-l-cyan-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium uppercase">Efectivo Esperado</span>
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-cyan-400">{formatCRC(session.expected_cash_amount)}</span>
                  <span className="text-[11px] text-text-muted block">Fondo + Ventas Efectivo</span>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Resumen Operativo del Turno Activo</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-muted">Responsable del Turno:</span>
                  <span className="text-white font-semibold">{session.user_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-muted">Caja / Terminal:</span>
                  <span className="text-white font-mono">Caja Principal 01 (POS-00001)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-muted">Total de Ventas Tarjeta / Datáfono:</span>
                  <span className="text-white font-mono">{formatCRC(session.sales_card)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border text-sm font-bold">
                  <span className="text-white">Total Facturado en Turno:</span>
                  <span className="text-primary font-mono">
                    {formatCRC(session.sales_cash + session.sales_sinpe + session.sales_card)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-surface-secondary rounded-full border border-border text-text-muted">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-white">No hay turno de caja activo</h3>
              <p className="text-xs text-text-muted">Debes registrar la apertura de caja y el fondo inicial para operar el POS.</p>
            </div>
            <Button variant="primary" onClick={() => setIsOpenModalOpen(true)}>
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Turno de Caja Ahora
            </Button>
          </Card>
        )}
      </div>

      <Modal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} title="Apertura de Turno de Caja" maxWidth="md">
        <form onSubmit={handleOpenSession} className="space-y-4">
          <Input
            label="Fondo Inicial en Efectivo (Colones CRC)"
            type="number"
            placeholder="Ej: 30000"
            value={openAmount}
            onChange={(e) => setOpenAmount(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Notas de Apertura (Opcional)"
            placeholder="Ej: Billetes de 1000 y 2000, monedas de 100 y 500"
            value={openNotes}
            onChange={(e) => setOpenNotes(e.target.value)}
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpenModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Confirmar Apertura
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Arqueo y Cierre de Caja (Reporte Z)" maxWidth="md">
        <form onSubmit={handleCloseSession} className="space-y-4">
          <div className="p-4 bg-surface-secondary border border-border rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Efectivo Teórico Esperado:</span>
              <span className="font-bold text-white font-mono">{formatCRC(expectedNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Ventas SINPE Móvil:</span>
              <span className="text-purple-400 font-mono">{formatCRC(session ? session.sales_sinpe : 0)}</span>
            </div>
          </div>

          <Input
            label="Efectivo Físico Contado en Caja (CRC)"
            type="number"
            placeholder="Ingresa el monto total contado"
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            required
            autoFocus
          />

          {actualNum > 0 && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                difference === 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : difference > 0
                  ? "bg-primary-subtle border-primary/30 text-primary"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <span>{difference === 0 ? "Caja Cuadrada Exacta" : difference > 0 ? "Sobrante de Caja:" : "Faltante de Caja:"}</span>
              <span className="font-mono text-sm font-bold">{formatCRC(Math.abs(difference))}</span>
            </div>
          )}

          <Input
            label="Observaciones de Cierre"
            placeholder="Ej: Justificación de diferencias o retiro de efectivo"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger">
              Cerrar Turno e Imprimir Reporte
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}