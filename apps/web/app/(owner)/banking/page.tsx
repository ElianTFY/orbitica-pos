"use client";

import React, { useState } from "react";
import {
  Building2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  CreditCard,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertTriangle,
  Wallet,
  Landmark,
  FileText,
  Smartphone,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { BankAccount, BankTransaction } from "@/types";

export default function BankingPage() {
  const { bankAccounts, bankTransactions, settings, addBankAccount, updateBankAccount, deleteBankAccount, addBankTransaction } = useStore();
  const [search, setSearch] = useState("");

  // Modals
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  // Form states for account
  const [bankName, setBankName] = useState("BAC Credomatic");
  const [accountType, setAccountType] = useState<BankAccount["account_type"]>("CORRIENTE");
  const [iban, setIban] = useState("");
  const [currency, setCurrency] = useState<"CRC" | "USD">("CRC");
  const [initialBalance, setInitialBalance] = useState<number | "">("");
  const [accountHolder, setAccountHolder] = useState(settings.legal_name || settings.trade_name || "");
  const [accountFormError, setAccountFormError] = useState<string | null>(null);

  // Form states for transaction
  const [selectedAccountId, setSelectedAccountId] = useState(bankAccounts[0]?.id || "");
  const [txType, setTxType] = useState<BankTransaction["transaction_type"]>("DEPOSIT");
  const [txAmount, setTxAmount] = useState<number | "">("");
  const [txDesc, setTxDesc] = useState("");
  const [txRef, setTxRef] = useState("");
  const [txFormError, setTxFormError] = useState<string | null>(null);

  const resetAccountForm = () => {
    setBankName("BAC Credomatic");
    setAccountType("CORRIENTE");
    setIban("");
    setCurrency("CRC");
    setInitialBalance("");
    setAccountHolder(settings.legal_name || settings.trade_name || "");
    setAccountFormError(null);
  };

  const resetTxForm = () => {
    setSelectedAccountId(bankAccounts[0]?.id || "");
    setTxType("DEPOSIT");
    setTxAmount("");
    setTxDesc("");
    setTxRef("");
    setTxFormError(null);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormError(null);

    if (!bankName.trim()) {
      setAccountFormError("El nombre del banco o entidad es requerido.");
      return;
    }

    if (accountType !== "SINPE_MOVIL" && (!iban.trim() || iban.length < 15)) {
      setAccountFormError("El número de cuenta IBAN costarricense debe tener un formato válido (Ej. CR...).");
      return;
    }

    const initBal = Number(initialBalance) || 0;
    addBankAccount({
      bank_name: bankName.trim(),
      account_type: accountType,
      iban: iban.trim() || "CR05010200000000000000",
      currency,
      current_balance: initBal,
      account_holder: accountHolder.trim() || settings.trade_name,
      is_active: true,
    });

    setIsCreateAccountOpen(false);
    resetAccountForm();
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setTxFormError(null);

    const numAmount = Number(txAmount);
    if (!selectedAccountId) {
      setTxFormError("Seleccione la cuenta bancaria de destino.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setTxFormError("El monto del movimiento debe ser mayor a 0.");
      return;
    }
    if (!txDesc.trim()) {
      setTxFormError("La descripción o concepto es requerido.");
      return;
    }

    addBankTransaction({
      bank_account_id: selectedAccountId,
      transaction_type: txType,
      amount: numAmount,
      description: txDesc.trim(),
      reference_number: txRef.trim() || undefined,
    });

    setIsRecordTxOpen(false);
    resetTxForm();
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteBankAccount(accountToDelete.id);
      setAccountToDelete(null);
    }
  };

  // Total liquidity in CRC
  const totalLiquidityCRC = bankAccounts
    .filter((a) => a.currency === "CRC")
    .reduce((acc, a) => acc + a.current_balance, 0);

  const totalLiquidityUSD = bankAccounts
    .filter((a) => a.currency === "USD")
    .reduce((acc, a) => acc + a.current_balance, 0);

  const filteredTransactions = bankTransactions.filter((tx) => {
    const acc = bankAccounts.find((a) => a.id === tx.bank_account_id);
    const accName = acc?.bank_name || "";
    return (
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      (tx.reference_number && tx.reference_number.toLowerCase().includes(search.toLowerCase())) ||
      accName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getTxTypeBadge = (type: BankTransaction["transaction_type"]) => {
    switch (type) {
      case "DEPOSIT":
      case "TRANSFER_IN":
      case "SALE_RECONCILIATION":
        return <Badge variant="success"><ArrowDownLeft className="w-3 h-3 mr-1" />Ingreso</Badge>;
      case "WITHDRAWAL":
      case "TRANSFER_OUT":
      case "EXPENSE_PAYMENT":
      default:
        return <Badge variant="danger"><ArrowUpRight className="w-3 h-3 mr-1" />Egreso</Badge>;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Bancos, Cuentas y Conciliación</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Control de cuentas bancarias (IBAN), SINPE Móvil y flujo de caja en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsRecordTxOpen(true)} className="gap-1.5" disabled={bankAccounts.length === 0}>
              <ArrowDownLeft className="w-4 h-4" />
              Movimiento Bancario
            </Button>
            <Button variant="primary" onClick={() => setIsCreateAccountOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Nueva Cuenta
            </Button>
          </div>
        </div>

        {/* Total Liquidity KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Liquidez Total (Colones)</p>
                <p className="text-xl font-black text-primary font-mono mt-1">{formatCRC(totalLiquidityCRC)}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">{bankAccounts.filter(a => a.currency === "CRC").length} cuentas en colones</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Liquidez Total (Dólares)</p>
                <p className="text-xl font-black text-emerald-500 font-mono mt-1">${totalLiquidityUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">{bankAccounts.filter(a => a.currency === "USD").length} cuentas en USD</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Movimientos Registrados</p>
                <p className="text-xl font-black text-cyan-500 font-mono mt-1">{bankTransactions.length}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">Conciliaciones y transferencias</p>
          </Card>
        </div>

        {/* Bank Accounts Grid */}
        <div>
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">
            Cuentas Bancarias Registradas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <Card key={acc.id} className="p-4 relative overflow-hidden bg-gradient-to-br from-surface to-surface-secondary border border-border flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center">
                        {acc.account_type === "SINPE_MOVIL" ? <Smartphone className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-text-main">{acc.bank_name}</h3>
                        <p className="text-[10px] text-text-muted">{acc.account_type === "SINPE_MOVIL" ? "SINPE Móvil" : `Cuenta ${acc.account_type}`}</p>
                      </div>
                    </div>
                    {bankAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAccountToDelete(acc)}
                        className="text-text-muted hover:text-semantic-danger-text p-1"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 p-2.5 bg-surface-input border border-border rounded-xl">
                    <p className="text-[10px] text-text-muted uppercase font-bold">IBAN / Número</p>
                    <p className="text-xs font-mono font-bold text-text-main truncate mt-0.5">{acc.iban}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex justify-between items-end">
                  <div>
                    <span className="text-[10px] text-text-muted block">Titular: {acc.account_holder}</span>
                    <span className="text-[10px] text-emerald-500 font-bold">● Cuenta Activa</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase font-bold">Saldo Disponible</p>
                    <p className="text-sm font-black font-mono text-primary">
                      {acc.currency === "CRC" ? formatCRC(acc.current_balance) : `$${acc.current_balance.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Historial de Movimientos y Conciliaciones
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                aria-label="Buscar movimiento bancario"
                placeholder="Buscar por concepto o referencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Historial de movimientos bancarios">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Fecha / Hora</th>
                    <th scope="col" className="pb-3 font-bold">Cuenta Bancaria</th>
                    <th scope="col" className="pb-3 font-bold">Tipo</th>
                    <th scope="col" className="pb-3 font-bold">Concepto / Descripción</th>
                    <th scope="col" className="pb-3 font-bold">Referencia</th>
                    <th scope="col" className="pb-3 font-bold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                          <Landmark className="w-6 h-6" />
                        </div>
                        <p>No hay movimientos bancarios registrados en esta organización.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const acc = bankAccounts.find((a) => a.id === tx.bank_account_id);
                      const isCredit = ["DEPOSIT", "TRANSFER_IN", "SALE_RECONCILIATION"].includes(tx.transaction_type);
                      return (
                        <tr key={tx.id} className="hover:bg-surface-hover transition-colors">
                          <td className="py-3 font-mono text-text-muted text-[11px]">{tx.created_at}</td>
                          <td className="py-3 font-medium text-text-main">{acc?.bank_name || "Cuenta Principal"}</td>
                          <td className="py-3">{getTxTypeBadge(tx.transaction_type)}</td>
                          <td className="py-3 text-text-main">{tx.description}</td>
                          <td className="py-3 font-mono text-text-muted text-[11px]">{tx.reference_number || "—"}</td>
                          <td className={`py-3 text-right font-mono font-bold ${isCredit ? "text-emerald-500" : "text-rose-500"}`}>
                            {isCredit ? "+" : "-"} {formatCRC(tx.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Modal New Account */}
        {isCreateAccountOpen && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateAccountOpen(false);
              resetAccountForm();
            }}
            title="Agregar Cuenta Bancaria o SINPE"
            maxWidth="md"
          >
            <form onSubmit={handleSaveAccount} className="space-y-4">
              {accountFormError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {accountFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="bank-select" className="block text-xs font-bold text-text-secondary">
                    Banco / Entidad *
                  </label>
                  <select
                    id="bank-select"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="BAC Credomatic">BAC Credomatic</option>
                    <option value="Banco de Costa Rica (BCR)">Banco de Costa Rica (BCR)</option>
                    <option value="Banco Nacional (BNCR)">Banco Nacional (BNCR)</option>
                    <option value="Banco Promerica">Banco Promerica</option>
                    <option value="Scotiabank CR">Scotiabank CR</option>
                    <option value="SINPE Móvil Comercial">SINPE Móvil Comercial</option>
                    <option value="Otro Banco">Otro Banco / Cooperativa</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="account-type" className="block text-xs font-bold text-text-secondary">
                    Tipo de Cuenta *
                  </label>
                  <select
                    id="account-type"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as BankAccount["account_type"])}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="CORRIENTE">Cuenta Corriente</option>
                    <option value="AHORROS">Cuenta de Ahorros</option>
                    <option value="SINPE_MOVIL">SINPE Móvil Dedicado</option>
                  </select>
                </div>
              </div>

              <Input
                id="bank-iban"
                label="Número de Cuenta IBAN (Costa Rica) *"
                placeholder="CR05010200000000000000"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                required={accountType !== "SINPE_MOVIL"}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="bank-currency" className="block text-xs font-bold text-text-secondary">
                    Moneda de la Cuenta *
                  </label>
                  <select
                    id="bank-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "CRC" | "USD")}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="CRC">Colones Costarricenses (CRC ₡)</option>
                    <option value="USD">Dólares Estadounidenses (USD $)</option>
                  </select>
                </div>

                <Input
                  id="bank-balance"
                  label="Saldo Inicial *"
                  type="number"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <Input
                id="bank-holder"
                label="Nombre del Titular de la Cuenta *"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreateAccountOpen(false);
                    resetAccountForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Guardar Cuenta
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Record Transaction */}
        {isRecordTxOpen && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsRecordTxOpen(false);
              resetTxForm();
            }}
            title="Registrar Movimiento Bancario / Conciliación"
            maxWidth="md"
          >
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {txFormError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {txFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="tx-account" className="block text-xs font-bold text-text-secondary">
                    Cuenta Bancaria Destino *
                  </label>
                  <select
                    id="tx-account"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank_name} ({a.currency === "CRC" ? formatCRC(a.current_balance) : `$${a.current_balance}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tx-type" className="block text-xs font-bold text-text-secondary">
                    Tipo de Movimiento *
                  </label>
                  <select
                    id="tx-type"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as BankTransaction["transaction_type"])}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="DEPOSIT">Depósito / Ingreso Directo (+)</option>
                    <option value="SALE_RECONCILIATION">Conciliación Cierre de Ventas (+)</option>
                    <option value="TRANSFER_IN">Transferencia Recibida (+)</option>
                    <option value="WITHDRAWAL">Retiro / Retiro de Fondos (-)</option>
                    <option value="EXPENSE_PAYMENT">Pago de Gasto / Servicio (-)</option>
                    <option value="TRANSFER_OUT">Transferencia Emitida (-)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="tx-amount"
                  label="Monto del Movimiento *"
                  type="number"
                  placeholder="Ej. 150000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />

                <Input
                  id="tx-ref"
                  label="Nº Comprobante / Referencia SINPE"
                  placeholder="Ej. 98765432"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                />
              </div>

              <Input
                id="tx-desc"
                label="Concepto / Justificación *"
                placeholder="Ej. Depósito de ventas semanales en efectivo"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsRecordTxOpen(false);
                    resetTxForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Aplicar Movimiento
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Confirmation */}
        {accountToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setAccountToDelete(null)}
            title="Confirmar Eliminación de Cuenta Bancaria"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar la cuenta <strong>{accountToDelete.bank_name}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setAccountToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Cuenta
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}