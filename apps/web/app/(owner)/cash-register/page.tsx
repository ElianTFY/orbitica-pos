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
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";

export default function CashRegisterPage() {
  const { activeCashSession, openCashSession, closeCashSession, settings } = useStore();
  const { user } = useAuth();

  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Form states
  const [openAmount, setOpenAmount] = useState("50000");
  const [actualCash, setActualCash] = useState("");

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    openCashSession(parseFloat(openAmount) || 0);
    setIsOpenModalOpen(false);
  };

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashSession();
    setIsCloseModalOpen(false);
    setActualCash("");
  };

  const expectedCash = activeCashSession
    ? activeCashSession.initial_amount + activeCashSession.cash_sales
    : 0;

  const actualNum = parseFloat(actualCash) || 0;
  const difference = actualCash ? actualNum - expectedCash : 0;

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Control de Caja y Arqueo de Turno</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} ({settings.branch_name}) — Apertura, ingresos en efectivo, SINPE, datáfono y arqueo
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeCashSession?.status === "OPEN" ? (
              <Button variant="danger" onClick={() => setIsCloseModalOpen(true)}>
                <Lock className="w-4 h-4 mr-1.5" />
                Cerrar Caja (Arqueo Z)
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsOpenModalOpen(true)}>
                <Unlock className="w-4 h-4 mr-1.5" />
                Abrir Turno de Caja
              </Button>
            )}
          </div>
        </div>

        {/* Active Session Status */}
        {activeCashSession?.status === "OPEN" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-emerald-500">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider block">Fondo Inicial de Caja</span>
                <span className="text-2xl font-black text-text-main font-mono mt-2 block">
                  {formatCRC(activeCashSession.initial_amount)}
                </span>
                <span className="text-[11px] text-text-muted">Monto base para vueltos</span>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider block">Ventas SINPE Móvil</span>
                <span className="text-2xl font-black text-primary font-mono mt-2 block">
                  {formatCRC(activeCashSession.sinpe_sales)}
                </span>
                <span className="text-[11px] text-text-muted">Transferencias directas</span>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider block">Ventas con Tarjeta</span>
                <span className="text-2xl font-black text-purple-500 font-mono mt-2 block">
                  {formatCRC(activeCashSession.card_sales)}
                </span>
                <span className="text-[11px] text-text-muted">Cobros por datáfono</span>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider block">Efectivo Total en Gaveta</span>
                <span className="text-2xl font-black text-emerald-500 font-mono mt-2 block">
                  {formatCRC(expectedCash)}
                </span>
                <span className="text-[11px] text-text-muted">Fondo + Ventas en efectivo</span>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <CardTitle>Turno de Caja Abierto</CardTitle>
                      <p className="text-xs text-text-muted">
                        Iniciado por: {user?.full_name || "Cajero"} • {activeCashSession.opened_at.replace("T", " ").substring(0, 19)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">CAJA EN LÍNEA</Badge>
                </div>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <Card className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-main">La caja se encuentra cerrada</h2>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Para comenzar a facturar y registrar ventas en el punto de venta, abre un nuevo turno indicando el fondo inicial.
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsOpenModalOpen(true)}>
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Caja Ahora
            </Button>
          </Card>
        )}
      </div>

      {/* Open Cash Modal */}
      <Modal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} title="Apertura de Turno de Caja" maxWidth="sm">
        <form onSubmit={handleOpenSession} className="space-y-4">
          <Input
            label="Fondo Inicial en Efectivo (CRC ₡)"
            type="number"
            placeholder="50000"
            value={openAmount}
            onChange={(e) => setOpenAmount(e.target.value)}
            required
            autoFocus
          />

          <div className="p-3 bg-surface-secondary rounded-xl border border-border text-xs text-text-muted">
            Este monto corresponde al dinero físico en billetes y monedas que se deja en la gaveta para dar cambio a los clientes.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpenModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Confirmar Apertura
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Cash Modal */}
      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Cierre de Caja (Arqueo Z)" maxWidth="md">
        <form onSubmit={handleCloseSession} className="space-y-4">
          <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Efectivo Esperado en Gaveta:</span>
              <span className="font-mono font-bold text-text-main">{formatCRC(expectedCash)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Total Ventas SINPE:</span>
              <span className="font-mono font-bold text-text-main">{formatCRC(activeCashSession?.sinpe_sales || 0)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Total Ventas Tarjeta:</span>
              <span className="font-mono font-bold text-text-main">{formatCRC(activeCashSession?.card_sales || 0)}</span>
            </div>
          </div>

          <Input
            label="Efectivo Físico Contado en Gaveta (CRC ₡)"
            type="number"
            placeholder={expectedCash.toString()}
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            required
            autoFocus
          />

          {actualCash && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                difference === 0
                  ? "bg-semantic-success-bg border-semantic-success-border text-semantic-success-text"
                  : difference > 0
                  ? "bg-primary-subtle border-primary text-primary"
                  : "bg-semantic-danger-bg border-semantic-danger-border text-semantic-danger-text"
              }`}
            >
              <span>{difference === 0 ? "Cuadre Exacto" : difference > 0 ? "Sobrante de Caja" : "Faltante de Caja"}</span>
              <span className="font-mono text-sm">{formatCRC(Math.abs(difference))}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger">
              Confirmar y Cerrar Caja
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}