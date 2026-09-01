"use client";

import React, { useState } from "react";
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  CreditCard,
  Building,
  TrendingDown,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertTriangle,
  FileText,
  Calendar,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { Expense } from "@/types";

export default function ExpensesPage() {
  const { expenses, suppliers, branches, settings, addExpense, updateExpense, deleteExpense } = useStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Form states
  const [category, setCategory] = useState<Expense["category"]>("SERVICIOS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<Expense["payment_method"]>("SINPE");
  const [supplierName, setSupplierName] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [branchName, setBranchName] = useState(branches[0]?.name || settings.branch_name || "Sucursal Central (001)");
  const [status, setStatus] = useState<"PAID" | "PENDING">("PAID");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCategory("SERVICIOS");
    setDescription("");
    setAmount("");
    setPaymentMethod("SINPE");
    setSupplierName("");
    setInvoiceRef("");
    setBranchName(branches[0]?.name || settings.branch_name || "Sucursal Central (001)");
    setStatus("PAID");
    setDueDate("");
    setFormError(null);
    setEditingExpense(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setCategory(exp.category);
    setDescription(exp.description);
    setAmount(exp.amount);
    setPaymentMethod(exp.payment_method);
    setSupplierName(exp.supplier_name || "");
    setInvoiceRef(exp.invoice_ref || "");
    setBranchName(exp.branch_name);
    setStatus(exp.status);
    setDueDate(exp.due_date || "");
    setIsCreateModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = Number(amount);
    if (!description.trim()) {
      setFormError("La descripción del gasto es obligatoria.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("El monto debe ser un valor numérico mayor a ₡0.");
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        category,
        description: description.trim(),
        amount: numAmount,
        payment_method: paymentMethod,
        supplier_name: supplierName.trim() || undefined,
        invoice_ref: invoiceRef.trim() || undefined,
        branch_name: branchName,
        status,
        due_date: status === "PENDING" && dueDate ? dueDate : undefined,
      });
    } else {
      addExpense({
        category,
        description: description.trim(),
        amount: numAmount,
        payment_method: paymentMethod,
        supplier_name: supplierName.trim() || undefined,
        invoice_ref: invoiceRef.trim() || undefined,
        branch_name: branchName,
        status,
        due_date: status === "PENDING" && dueDate ? dueDate : undefined,
      });
    }

    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  const handleMarkAsPaid = (exp: Expense) => {
    updateExpense(exp.id, { status: "PAID" });
  };

  // KPIs
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const paidExpenses = expenses.filter((e) => e.status === "PAID").reduce((acc, e) => acc + e.amount, 0);
  const pendingExpenses = expenses.filter((e) => e.status === "PENDING").reduce((acc, e) => acc + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.expense_number.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.supplier_name && e.supplier_name.toLowerCase().includes(search.toLowerCase())) ||
      (e.invoice_ref && e.invoice_ref.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryBadge = (cat: Expense["category"]) => {
    const colors: Record<string, string> = {
      ALQUILER: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      SERVICIOS: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      SALARIOS: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      PROVEEDORES: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      SUMINISTROS: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      IMPUESTOS: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      MANTENIMIENTO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      OTROS: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[cat] || colors.OTROS}`}>
        {cat}
      </span>
    );
  };

  const getPaymentMethodLabel = (pm: Expense["payment_method"]) => {
    switch (pm) {
      case "SINPE":
        return "SINPE Móvil";
      case "TRANSFER":
        return "Transferencia";
      case "CARD":
        return "Tarjeta";
      case "CASH_CRC":
      default:
        return "Efectivo";
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Gastos y Cuentas por Pagar</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Control de egresos operativos, servicios, alquileres y cuentas pendientes
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Registrar Gasto
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Egresos</p>
                <p className="text-xl font-black text-rose-500 font-mono mt-1">{formatCRC(totalExpenses)}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">{expenses.length} registros registrados</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Gastos Pagados</p>
                <p className="text-xl font-black text-emerald-500 font-mono mt-1">{formatCRC(paidExpenses)}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">Cancelados y conciliados</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Por Pagar / Crédito</p>
                <p className="text-xl font-black text-amber-500 font-mono mt-1">{formatCRC(pendingExpenses)}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2">Cuentas pendientes a proveedores</p>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              aria-label="Buscar gastos"
              placeholder="Buscar por descripción, proveedor, factura o número (GAS-...)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrar por categoría de gasto"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-surface-input border border-border rounded-2xl text-xs text-text-main focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="ALQUILER">Alquiler</option>
              <option value="SERVICIOS">Servicios Públicos</option>
              <option value="SALARIOS">Salarios / Planilla</option>
              <option value="PROVEEDORES">Proveedores</option>
              <option value="SUMINISTROS">Suministros</option>
              <option value="IMPUESTOS">Impuestos / Tasas</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="OTROS">Otros</option>
            </select>

            <select
              aria-label="Filtrar por estado de pago"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-surface-input border border-border rounded-2xl text-xs text-text-main focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PAID">Pagados</option>
              <option value="PENDING">Pendientes</option>
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de gastos operativos">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Nº Gasto</th>
                  <th scope="col" className="pb-3 font-bold">Categoría</th>
                  <th scope="col" className="pb-3 font-bold">Descripción / Proveedor</th>
                  <th scope="col" className="pb-3 font-bold">Fecha / Vencimiento</th>
                  <th scope="col" className="pb-3 font-bold">Método</th>
                  <th scope="col" className="pb-3 font-bold">Monto</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                        <TrendingDown className="w-6 h-6" />
                      </div>
                      <p>
                        {expenses.length === 0
                          ? "No has registrado gastos todavía. Registra tus costos operativos para un balance financiero exacto."
                          : "No se encontraron gastos que coincidan con la búsqueda."}
                      </p>
                      {expenses.length === 0 && (
                        <Button variant="secondary" size="sm" onClick={handleOpenCreate} className="mt-2">
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Registrar Primer Gasto
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-mono font-bold text-primary flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        {exp.expense_number}
                      </td>
                      <td className="py-3">{getCategoryBadge(exp.category)}</td>
                      <td className="py-3 font-medium text-text-main">
                        <div>
                          <span>{exp.description}</span>
                          {exp.supplier_name && (
                            <span className="block text-[10px] text-text-muted">
                              Prov: {exp.supplier_name} {exp.invoice_ref ? `(Fact: ${exp.invoice_ref})` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-[11px] font-mono text-text-muted">
                        <div>{exp.created_at}</div>
                        {exp.due_date && exp.status === "PENDING" && (
                          <span className="text-[10px] text-amber-500 font-bold block">
                            Vence: {exp.due_date}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-text-secondary">{getPaymentMethodLabel(exp.payment_method)}</td>
                      <td className="py-3 font-mono font-black text-rose-500">{formatCRC(exp.amount)}</td>
                      <td className="py-3">
                        {exp.status === "PAID" ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Pagado
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            <Clock className="w-3 h-3 mr-1" />
                            Por Pagar
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {exp.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(exp)}
                              className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Marcar como Pagado"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                            title="Editar gasto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create / Edit Expense Modal */}
        {isCreateModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}
            title={editingExpense ? "Editar Registro de Gasto" : "Registrar Nuevo Gasto Operativo"}
            maxWidth="md"
          >
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="expense-category" className="block text-xs font-bold text-text-secondary">
                    Categoría del Gasto *
                  </label>
                  <select
                    id="expense-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Expense["category"])}
                    required
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="ALQUILER">Alquiler de Local</option>
                    <option value="SERVICIOS">Servicios Públicos (Luz / Agua / Internet)</option>
                    <option value="SALARIOS">Salarios / Planilla</option>
                    <option value="PROVEEDORES">Pago a Proveedores / Materia Prima</option>
                    <option value="SUMINISTROS">Suministros de Oficina / Limpieza</option>
                    <option value="IMPUESTOS">Impuestos y Cargas Sociales</option>
                    <option value="MANTENIMIENTO">Mantenimiento y Reparaciones</option>
                    <option value="OTROS">Otros Gastos Varios</option>
                  </select>
                </div>

                <Input
                  id="expense-amount"
                  label="Monto Total (CRC) *"
                  type="number"
                  placeholder="Ej. 75000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </div>

              <Input
                id="expense-desc"
                label="Descripción del Gasto *"
                placeholder="Ej. Pago de recibo de electricidad CNFL mes corriente"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="expense-supplier" className="block text-xs font-bold text-text-secondary">
                    Proveedor (Opcional)
                  </label>
                  <input
                    id="expense-supplier"
                    list="suppliers-expense-list"
                    placeholder="Escriba o seleccione proveedor..."
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                  <datalist id="suppliers-expense-list">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <Input
                  id="expense-invoice-ref"
                  label="Nº Factura / Comprobante"
                  placeholder="Ej. FAC-00123"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="expense-payment-method" className="block text-xs font-bold text-text-secondary">
                    Método de Pago *
                  </label>
                  <select
                    id="expense-payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as Expense["payment_method"])}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="SINPE">SINPE Móvil</option>
                    <option value="TRANSFER">Transferencia Bancaria</option>
                    <option value="CASH_CRC">Efectivo de Caja</option>
                    <option value="CARD">Tarjeta de Débito/Crédito</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="expense-status" className="block text-xs font-bold text-text-secondary">
                    Estado del Gasto *
                  </label>
                  <select
                    id="expense-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "PAID" | "PENDING")}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="PAID">Pagado / Egresado</option>
                    <option value="PENDING">Cuenta por Pagar (Pendiente)</option>
                  </select>
                </div>
              </div>

              {status === "PENDING" && (
                <Input
                  id="expense-due-date"
                  label="Fecha de Vencimiento de Pago"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {editingExpense ? "Actualizar Gasto" : "Guardar Gasto"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Modal */}
        {expenseToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setExpenseToDelete(null)}
            title="Confirmar Eliminación de Gasto"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar el gasto <strong>{expenseToDelete.expense_number}</strong> ({formatCRC(expenseToDelete.amount)})?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setExpenseToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Gasto
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}