"use client";

import React, { useState } from "react";
import {
  Truck,
  Plus,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  Send,
  Trash2,
  Edit2,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  User,
  Navigation,
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
import { DispatchOrder } from "@/types";

export default function DispatchPage() {
  const { dispatchOrders, employees, customers, sales, settings, addDispatchOrder, updateDispatchOrder, deleteDispatchOrder } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<DispatchOrder | null>(null);
  const [dispatchToDelete, setDispatchToDelete] = useState<DispatchOrder | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [driverName, setDriverName] = useState("");
  const [saleNumber, setSaleNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] = useState<DispatchOrder["payment_status"]>("PAID");
  const [status, setStatus] = useState<DispatchOrder["status"]>("PENDING");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setDriverName(employees[0]?.full_name || "");
    setSaleNumber(`VEN-${String(Date.now()).slice(-4)}`);
    setTotalAmount("");
    setPaymentStatus("PAID");
    setStatus("PENDING");
    setNotes("");
    setFormError(null);
    setEditingDispatch(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (dsp: DispatchOrder) => {
    setEditingDispatch(dsp);
    setCustomerName(dsp.customer_name);
    setCustomerPhone(dsp.customer_phone);
    setDeliveryAddress(dsp.delivery_address);
    setDriverName(dsp.driver_name || "");
    setSaleNumber(dsp.sale_number);
    setTotalAmount(dsp.total_amount);
    setPaymentStatus(dsp.payment_status);
    setStatus(dsp.status);
    setNotes(dsp.notes || "");
    setIsCreateModalOpen(true);
  };

  const handleSelectCustomer = (name: string) => {
    setCustomerName(name);
    const found = customers.find((c) => c.name === name);
    if (found) {
      setCustomerPhone(found.phone || "");
      if (found.address) setDeliveryAddress(found.address);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError("El nombre del cliente es obligatorio.");
      return;
    }
    if (!deliveryAddress.trim()) {
      setFormError("La dirección de entrega es requerida.");
      return;
    }

    const numAmount = Number(totalAmount) || 0;

    if (editingDispatch) {
      updateDispatchOrder(editingDispatch.id, {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        driver_name: driverName || undefined,
        sale_number: saleNumber.trim(),
        total_amount: numAmount,
        payment_status: paymentStatus,
        status,
        notes: notes.trim() || undefined,
        delivered_at: status === "DELIVERED" ? new Date().toISOString().replace("T", " ").substring(0, 16) : undefined,
      });
    } else {
      addDispatchOrder({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        driver_name: driverName || undefined,
        sale_number: saleNumber.trim() || `VEN-${String(Date.now()).slice(-4)}`,
        total_amount: numAmount,
        payment_status: paymentStatus,
        status,
        notes: notes.trim() || undefined,
      });
    }

    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (dispatchToDelete) {
      deleteDispatchOrder(dispatchToDelete.id);
      setDispatchToDelete(null);
    }
  };

  const handleAdvanceStatus = (dsp: DispatchOrder) => {
    let nextStatus: DispatchOrder["status"] = dsp.status;
    if (dsp.status === "PENDING") nextStatus = "ASSIGNED";
    else if (dsp.status === "ASSIGNED") nextStatus = "IN_ROUTE";
    else if (dsp.status === "IN_ROUTE") nextStatus = "DELIVERED";

    updateDispatchOrder(dsp.id, {
      status: nextStatus,
      delivered_at: nextStatus === "DELIVERED" ? new Date().toISOString().replace("T", " ").substring(0, 16) : undefined,
    });
  };

  const filteredDispatches = dispatchOrders.filter((d) => {
    const matchesSearch =
      d.dispatch_number.toLowerCase().includes(search.toLowerCase()) ||
      d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      d.delivery_address.toLowerCase().includes(search.toLowerCase()) ||
      d.customer_phone.includes(search);
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (st: DispatchOrder["status"]) => {
    switch (st) {
      case "DELIVERED":
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Entregado</Badge>;
      case "IN_ROUTE":
        return <Badge variant="blue"><Navigation className="w-3 h-3 mr-1" />En Ruta</Badge>;
      case "ASSIGNED":
        return <Badge variant="warning"><Truck className="w-3 h-3 mr-1" />Asignado</Badge>;
      case "FAILED":
        return <Badge variant="danger">No Entregado</Badge>;
      case "PENDING":
      default:
        return <Badge variant="default">Pendiente</Badge>;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Despachos, Envíos y Rutas</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Asignación de mensajeros, control de entregas express y navegación Waze / Maps
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Despacho
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              aria-label="Buscar despacho"
              placeholder="Buscar por Nº Despacho (DSP-...), cliente, dirección o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: "ALL", label: "Todos" },
              { key: "PENDING", label: "Pendientes" },
              { key: "IN_ROUTE", label: "En Ruta" },
              { key: "DELIVERED", label: "Entregados" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === f.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dispatch Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de despachos y rutas">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Nº Despacho</th>
                  <th scope="col" className="pb-3 font-bold">Cliente / Teléfono</th>
                  <th scope="col" className="pb-3 font-bold">Dirección de Entrega</th>
                  <th scope="col" className="pb-3 font-bold">Chofer / Repartidor</th>
                  <th scope="col" className="pb-3 font-bold">Monto / Cobro</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                        <Truck className="w-6 h-6" />
                      </div>
                      <p>
                        {dispatchOrders.length === 0
                          ? "No hay despachos registrados. Registra tu primera orden de entrega o servicio express."
                          : "No se encontraron despachos que coincidan con la búsqueda."}
                      </p>
                      {dispatchOrders.length === 0 && (
                        <Button variant="secondary" size="sm" onClick={handleOpenCreate} className="mt-2">
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Crear Primer Despacho
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDispatches.map((dsp) => (
                    <tr key={dsp.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-mono font-bold text-primary flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        {dsp.dispatch_number}
                      </td>
                      <td className="py-3 font-medium text-text-main">
                        <div>
                          <span>{dsp.customer_name}</span>
                          <span className="block text-[10px] text-text-muted font-mono">{dsp.customer_phone}</span>
                        </div>
                      </td>
                      <td className="py-3 text-text-secondary">
                        <div className="flex items-start gap-1 max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-[11px] truncate">{dsp.delivery_address}</span>
                        </div>
                      </td>
                      <td className="py-3 text-text-main font-medium">{dsp.driver_name || "Sin asignar"}</td>
                      <td className="py-3 font-mono font-bold">
                        <div>{formatCRC(dsp.total_amount)}</div>
                        <span className="text-[10px] text-text-muted font-normal block">
                          {dsp.payment_status === "PAID"
                            ? "✓ Pagado"
                            : dsp.payment_status === "PENDING_CASH"
                            ? "Cobrar Efectivo"
                            : "Cobrar SINPE"}
                        </span>
                      </td>
                      <td className="py-3">{getStatusBadge(dsp.status)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Open in Waze / Maps */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              dsp.delivery_address + ", Costa Rica"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Abrir en Google Maps / Waze"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Notify customer via WhatsApp */}
                          {dsp.customer_phone && (
                            <a
                              href={`https://wa.me/${dsp.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Hola ${dsp.customer_name}, su pedido (${dsp.dispatch_number}) de ${settings.trade_name} está en estado: ${dsp.status === "IN_ROUTE" ? "¡EN RUTA DE ENTREGA HACIA SU DIRECCIÓN!" : dsp.status === "DELIVERED" ? "¡ENTREGADO CON ÉXITO!" : "PREPARANDO DESPACHO"}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Notificar por WhatsApp"
                            >
                              <Smartphone className="w-4 h-4" />
                            </a>
                          )}

                          {/* Advance Status button */}
                          {dsp.status !== "DELIVERED" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(dsp)}
                              className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Avanzar estado del despacho"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(dsp)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                            title="Editar despacho"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDispatchToDelete(dsp)}
                            className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors"
                            title="Eliminar despacho"
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

        {/* Create / Edit Modal */}
        {isCreateModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}
            title={editingDispatch ? "Editar Orden de Despacho" : "Nueva Orden de Despacho / Delivery"}
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
                  <label htmlFor="dsp-cust-name" className="block text-xs font-bold text-text-secondary">
                    Cliente Receptor *
                  </label>
                  <input
                    id="dsp-cust-name"
                    list="customers-dsp-list"
                    placeholder="Escriba o seleccione cliente..."
                    value={customerName}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                  <datalist id="customers-dsp-list">
                    {customers.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <Input
                  id="dsp-cust-phone"
                  label="Teléfono / WhatsApp *"
                  placeholder="+506 8888-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dsp-address" className="block text-xs font-bold text-text-secondary">
                  Dirección Exacta de Entrega (Señas Costa Rica) *
                </label>
                <textarea
                  id="dsp-address"
                  rows={2}
                  placeholder="Ej. San José, Montes de Oca, 200m este de la Iglesia, casa blanca dos pisos"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="dsp-driver" className="block text-xs font-bold text-text-secondary">
                    Chofer / Repartidor Asignado
                  </label>
                  <select
                    id="dsp-driver"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Sin asignar --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.full_name}>
                        {emp.full_name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  id="dsp-amount"
                  label="Monto del Pedido (CRC)"
                  type="number"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="dsp-payment-status" className="block text-xs font-bold text-text-secondary">
                    Estado de Pago *
                  </label>
                  <select
                    id="dsp-payment-status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as DispatchOrder["payment_status"])}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="PAID">Ya Pagado (Previo)</option>
                    <option value="PENDING_CASH">Contra Entrega (Efectivo)</option>
                    <option value="PENDING_SINPE">Contra Entrega (SINPE Móvil)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dsp-status" className="block text-xs font-bold text-text-secondary">
                    Estado del Despacho *
                  </label>
                  <select
                    id="dsp-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DispatchOrder["status"])}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="PENDING">Pendiente de Preparar</option>
                    <option value="ASSIGNED">Asignado a Chofer</option>
                    <option value="IN_ROUTE">En Ruta / Camino</option>
                    <option value="DELIVERED">Entregado con Éxito</option>
                    <option value="FAILED">No Entregado / Fallido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dsp-notes" className="block text-xs font-bold text-text-secondary">
                  Notas de Entrega (Instrucciones)
                </label>
                <input
                  id="dsp-notes"
                  placeholder="Ej. Tocar timbre portón negro, llamar al llegar"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

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
                  {editingDispatch ? "Actualizar Despacho" : "Crear Orden de Despacho"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Modal */}
        {dispatchToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setDispatchToDelete(null)}
            title="Confirmar Eliminación de Despacho"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar el despacho <strong>{dispatchToDelete.dispatch_number}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setDispatchToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Despacho
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}