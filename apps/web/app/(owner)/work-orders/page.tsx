"use client";

import React, { useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  Printer,
  Trash2,
  Edit2,
  ArrowRight,
  User,
  AlertTriangle,
  FileText,
  DollarSign,
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
import { WorkOrder } from "@/types";
import Link from "next/link";

export default function WorkOrdersPage() {
  const { workOrders, employees, customers, settings, addWorkOrder, updateWorkOrder, deleteWorkOrder } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<WorkOrder | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [serviceType, setServiceType] = useState<WorkOrder["service_type"]>("REPARACION");
  const [itemDescription, setItemDescription] = useState("");
  const [issueReported, setIssueReported] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [assignedTechnician, setAssignedTechnician] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | "">("");
  const [advancePayment, setAdvancePayment] = useState<number | "">("");
  const [status, setStatus] = useState<WorkOrder["status"]>("RECEIVED");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setServiceType("REPARACION");
    setItemDescription("");
    setIssueReported("");
    setDiagnosis("");
    setAssignedTechnician(employees[0]?.full_name || "");
    setEstimatedCost("");
    setAdvancePayment("");
    setStatus("RECEIVED");
    setEstimatedDelivery("");
    setFormError(null);
    setEditingOrder(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (wo: WorkOrder) => {
    setEditingOrder(wo);
    setCustomerName(wo.customer_name);
    setCustomerPhone(wo.customer_phone);
    setCustomerEmail(wo.customer_email || "");
    setServiceType(wo.service_type);
    setItemDescription(wo.item_description);
    setIssueReported(wo.issue_reported);
    setDiagnosis(wo.diagnosis || "");
    setAssignedTechnician(wo.assigned_technician || "");
    setEstimatedCost(wo.estimated_cost);
    setAdvancePayment(wo.advance_payment);
    setStatus(wo.status);
    setEstimatedDelivery(wo.estimated_delivery || "");
    setIsCreateModalOpen(true);
  };

  const handleSelectExistingCustomer = (name: string) => {
    setCustomerName(name);
    const found = customers.find((c) => c.name === name);
    if (found) {
      setCustomerPhone(found.phone || "");
      setCustomerEmail(found.email || "");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError("El nombre del cliente es obligatorio.");
      return;
    }
    if (!itemDescription.trim()) {
      setFormError("La descripción del equipo / artículo / vehículo es requerida.");
      return;
    }
    if (!issueReported.trim()) {
      setFormError("El detalle de la falla o requerimiento es requerido.");
      return;
    }

    const estCost = Number(estimatedCost) || 0;
    const advPay = Number(advancePayment) || 0;

    if (editingOrder) {
      updateWorkOrder(editingOrder.id, {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        service_type: serviceType,
        item_description: itemDescription.trim(),
        issue_reported: issueReported.trim(),
        diagnosis: diagnosis.trim() || undefined,
        assigned_technician: assignedTechnician || undefined,
        estimated_cost: estCost,
        advance_payment: advPay,
        status,
        estimated_delivery: estimatedDelivery || undefined,
      });
    } else {
      addWorkOrder({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        service_type: serviceType,
        item_description: itemDescription.trim(),
        issue_reported: issueReported.trim(),
        diagnosis: diagnosis.trim() || undefined,
        assigned_technician: assignedTechnician || undefined,
        estimated_cost: estCost,
        advance_payment: advPay,
        status,
        branch_name: settings.branch_name || "Sucursal Central (001)",
        estimated_delivery: estimatedDelivery || undefined,
      });
    }

    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      deleteWorkOrder(orderToDelete.id);
      setOrderToDelete(null);
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.order_number.toLowerCase().includes(search.toLowerCase()) ||
      wo.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      wo.item_description.toLowerCase().includes(search.toLowerCase()) ||
      wo.customer_phone.includes(search);
    const matchesStatus = statusFilter === "ALL" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (st: WorkOrder["status"]) => {
    switch (st) {
      case "READY":
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Listo para Entrega</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="blue"><Clock className="w-3 h-3 mr-1" />En Proceso</Badge>;
      case "IN_DIAGNOSIS":
        return <Badge variant="warning"><Search className="w-3 h-3 mr-1" />En Diagnóstico</Badge>;
      case "DELIVERED":
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Entregado</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelado</Badge>;
      case "RECEIVED":
      default:
        return <Badge variant="warning">Recibido</Badge>;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Citas y Órdenes de Servicio</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Control de reparaciones, citas, mantenimientos y seguimiento por WhatsApp
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Orden de Servicio
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              aria-label="Buscar orden de servicio"
              placeholder="Buscar por Nº Orden (OT-...), cliente, teléfono o equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: "ALL", label: "Todas" },
              { key: "RECEIVED", label: "Recibidas" },
              { key: "IN_PROGRESS", label: "En Proceso" },
              { key: "READY", label: "Listas" },
              { key: "DELIVERED", label: "Entregadas" },
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

        {/* Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de órdenes de servicio">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Nº Orden</th>
                  <th scope="col" className="pb-3 font-bold">Cliente / Teléfono</th>
                  <th scope="col" className="pb-3 font-bold">Equipo / Artículo</th>
                  <th scope="col" className="pb-3 font-bold">Falla / Servicio</th>
                  <th scope="col" className="pb-3 font-bold">Técnico</th>
                  <th scope="col" className="pb-3 font-bold">Costo Est.</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <p>
                        {workOrders.length === 0
                          ? "No hay órdenes de servicio ni citas activas. Crea tu primera orden de trabajo para tus clientes."
                          : "No se encontraron órdenes de servicio que coincidan con los filtros."}
                      </p>
                      {workOrders.length === 0 && (
                        <Button variant="secondary" size="sm" onClick={handleOpenCreate} className="mt-2">
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Crear Primera Orden
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((wo) => {
                    const pendingAmount = wo.estimated_cost - wo.advance_payment;
                    return (
                      <tr key={wo.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-mono font-bold text-primary flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          {wo.order_number}
                        </td>
                        <td className="py-3 font-medium text-text-main">
                          <div>
                            <span>{wo.customer_name}</span>
                            <span className="block text-[10px] text-text-muted font-mono">{wo.customer_phone}</span>
                          </div>
                        </td>
                        <td className="py-3 text-text-main font-medium">{wo.item_description}</td>
                        <td className="py-3 text-text-secondary">
                          <div>
                            <span className="font-bold text-[10px] uppercase text-primary block">{wo.service_type}</span>
                            <span className="text-[11px] truncate max-w-xs block">{wo.issue_reported}</span>
                          </div>
                        </td>
                        <td className="py-3 text-text-muted text-[11px]">{wo.assigned_technician || "Por asignar"}</td>
                        <td className="py-3 font-mono font-bold text-emerald-500">
                          <div>{formatCRC(wo.estimated_cost)}</div>
                          {wo.advance_payment > 0 && (
                            <span className="text-[10px] text-text-muted font-normal block">
                              Adelanto: {formatCRC(wo.advance_payment)}
                            </span>
                          )}
                        </td>
                        <td className="py-3">{getStatusBadge(wo.status)}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {wo.customer_phone && (
                              <a
                                href={`https://wa.me/${wo.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Hola ${wo.customer_name}, le informamos sobre el estado de su orden de servicio ${wo.order_number} (${wo.item_description}) en ${settings.trade_name}: Estado actual: ${wo.status === "READY" ? "¡LISTO PARA RETIRO!" : wo.status === "IN_PROGRESS" ? "EN REPARACIÓN" : "EN REVISIÓN"}. Saldo pendiente: ${formatCRC(pendingAmount)}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Notificar por WhatsApp"
                              >
                                <Smartphone className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewingOrder(wo)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                              title="Ver e Imprimir Comprobante"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(wo)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                              title="Editar orden"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(wo)}
                              className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors"
                              title="Eliminar orden"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
            title={editingOrder ? "Editar Orden de Servicio" : "Nueva Orden de Trabajo / Cita"}
            maxWidth="lg"
          >
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {formError}
                </div>
              )}

              {/* Customer Info */}
              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-3">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Cliente y Contacto
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="wo-cust-name" className="block text-xs font-bold text-text-secondary">
                      Nombre del Cliente *
                    </label>
                    <input
                      id="wo-cust-name"
                      list="customers-wo-list"
                      placeholder="Escriba o seleccione cliente..."
                      value={customerName}
                      onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                    <datalist id="customers-wo-list">
                      {customers.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>

                  <Input
                    id="wo-cust-phone"
                    label="Teléfono / WhatsApp *"
                    placeholder="+506 8888-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Service & Item Details */}
              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-3">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Detalles del Servicio
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="wo-service-type" className="block text-xs font-bold text-text-secondary">
                      Tipo de Servicio *
                    </label>
                    <select
                      id="wo-service-type"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value as WorkOrder["service_type"])}
                      className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="REPARACION">Reparación Técnica</option>
                      <option value="MANTENIMIENTO">Mantenimiento Preventivo</option>
                      <option value="DIAGNOSTICO">Diagnóstico / Revisión</option>
                      <option value="INSTALACION">Instalación / Armado</option>
                      <option value="CITA_SERVICIO">Cita de Atención</option>
                      <option value="GARANTIA">Garantía / Reclamo</option>
                    </select>
                  </div>

                  <Input
                    id="wo-item-desc"
                    label="Equipo / Vehículo / Artículo *"
                    placeholder="Ej. Laptop Dell Inspiron 15 / Toyota Corolla 2018"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="wo-issue" className="block text-xs font-bold text-text-secondary">
                    Falla Reportada / Requerimiento del Cliente *
                  </label>
                  <textarea
                    id="wo-issue"
                    rows={2}
                    placeholder="Detalle exactamente lo que el cliente describe..."
                    value={issueReported}
                    onChange={(e) => setIssueReported(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="wo-tech" className="block text-xs font-bold text-text-secondary">
                      Técnico Asignado
                    </label>
                    <select
                      id="wo-tech"
                      value={assignedTechnician}
                      onChange={(e) => setAssignedTechnician(e.target.value)}
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

                  <div className="space-y-1.5">
                    <label htmlFor="wo-status" className="block text-xs font-bold text-text-secondary">
                      Estado de la Orden *
                    </label>
                    <select
                      id="wo-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as WorkOrder["status"])}
                      className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="RECEIVED">Recibido</option>
                      <option value="IN_DIAGNOSIS">En Diagnóstico</option>
                      <option value="IN_PROGRESS">En Proceso / Reparación</option>
                      <option value="READY">Listo para Entrega</option>
                      <option value="DELIVERED">Entregado al Cliente</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial and Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  id="wo-cost"
                  label="Costo Estimado (CRC)"
                  type="number"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value === "" ? "" : Number(e.target.value))}
                />

                <Input
                  id="wo-advance"
                  label="Adelanto Pagado (CRC)"
                  type="number"
                  placeholder="0.00"
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value === "" ? "" : Number(e.target.value))}
                />

                <Input
                  id="wo-delivery"
                  label="Fecha Estimada Entrega"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
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
                  {editingOrder ? "Actualizar Orden" : "Emitir Orden de Servicio"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* View / Print Modal */}
        {viewingOrder && (
          <Modal
            isOpen={true}
            onClose={() => setViewingOrder(null)}
            title={`Comprobante de Servicio — ${viewingOrder.order_number}`}
            maxWidth="md"
          >
            <div className="space-y-4">
              <div className="bg-white text-black p-6 rounded-2xl border border-gray-200 text-xs font-sans space-y-4">
                <div className="flex justify-between items-start border-b pb-4 border-gray-200">
                  <div>
                    <h2 className="text-base font-black uppercase text-gray-900">{settings.trade_name}</h2>
                    <p className="text-[11px] text-gray-600">Servicio Técnico y Reparaciones</p>
                    <p className="text-[10px] text-gray-500">Tel: {settings.phone || "Costa Rica"}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded text-[10px]">
                      ORDEN DE TRABAJO
                    </span>
                    <p className="text-sm font-black font-mono text-gray-900 mt-1">{viewingOrder.order_number}</p>
                    <p className="text-[10px] text-gray-500">{viewingOrder.created_at}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl text-[11px]">
                  <div>
                    <p><strong>Cliente:</strong> {viewingOrder.customer_name}</p>
                    <p><strong>Teléfono:</strong> {viewingOrder.customer_phone}</p>
                  </div>
                  <div>
                    <p><strong>Tipo:</strong> {viewingOrder.service_type}</p>
                    <p><strong>Técnico:</strong> {viewingOrder.assigned_technician || "General"}</p>
                  </div>
                </div>

                <div className="p-3 border border-gray-200 rounded-xl space-y-1 text-[11px]">
                  <p><strong>Artículo / Equipo:</strong> {viewingOrder.item_description}</p>
                  <p><strong>Falla Reportada:</strong> {viewingOrder.issue_reported}</p>
                  {viewingOrder.diagnosis && <p><strong>Diagnóstico:</strong> {viewingOrder.diagnosis}</p>}
                </div>

                <div className="border-t border-gray-300 pt-2 space-y-1 text-[11px] text-right font-mono">
                  <p>Costo Estimado: {formatCRC(viewingOrder.estimated_cost)}</p>
                  <p>Adelanto Realizado: -{formatCRC(viewingOrder.advance_payment)}</p>
                  <p className="text-sm font-black text-gray-900 border-t pt-1">
                    SALDO PENDIENTE: {formatCRC(viewingOrder.estimated_cost - viewingOrder.advance_payment)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setViewingOrder(null)}>
                  Cerrar
                </Button>
                <Button variant="primary" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-4 h-4" />
                  Imprimir Comprobante
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation */}
        {orderToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setOrderToDelete(null)}
            title="Confirmar Eliminación de Orden"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar la orden <strong>{orderToDelete.order_number}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setOrderToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Orden
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}