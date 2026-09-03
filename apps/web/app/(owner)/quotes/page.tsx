"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Printer,
  Trash2,
  Edit2,
  ArrowRight,
  User,
  Package,
  Calendar,
  AlertTriangle,
  FileCheck2,
  DollarSign,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { Quote, QuoteItem, Product } from "@/types";
import { api } from "@/lib/api-client";
import Link from "next/link";

export default function QuotesPage() {
  const { quotes, products, customers, settings, activeCashSession, addQuote, updateQuote, deleteQuote } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);

  // Create / Edit modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerCedula, setCustomerCedula] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [validDays, setValidDays] = useState(15);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerName("");
    setCustomerCedula("");
    setCustomerEmail("");
    setCustomerPhone("");
    setValidDays(15);
    setNotes("");
    setItems([]);
    setSelectedProductId("");
    setItemQuantity(1);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleSelectExistingCustomer = (name: string) => {
    setCustomerName(name);
    const found = customers.find((c) => c.name === name);
    if (found) {
      setCustomerCedula(found.identification_number);
      setCustomerEmail(found.email || "");
      setCustomerPhone(found.phone || "");
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const unitPrice = prod.sale_price;
    const taxRate = prod.tax_rate;
    const qty = Math.max(1, Number(itemQuantity) || 1);
    const subtotal = unitPrice * qty;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const newItem: QuoteItem = {
      product_id: prod.id,
      name: prod.name,
      quantity: qty,
      unit_price: unitPrice,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      subtotal,
      total,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProductId("");
    setItemQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotalTotal = items.reduce((acc, it) => acc + it.subtotal, 0);
  const taxTotal = items.reduce((acc, it) => acc + it.tax_amount, 0);
  const grandTotal = subtotalTotal + taxTotal;

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError("El nombre del cliente es requerido para la cotización.");
      return;
    }

    if (items.length === 0) {
      setFormError("Debes agregar al menos un producto o servicio a la cotización.");
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validDays);
    const validUntilStr = expiryDate.toISOString().replace("T", " ").substring(0, 10);

    const matchedCustomer = customers.find(
      (c) =>
        (customerCedula && c.identification_number === customerCedula) ||
        (customerName && c.name.toLowerCase() === customerName.toLowerCase())
    );

    if (editingQuote) {
      updateQuote(editingQuote.id, {
        customer_name: customerName.trim(),
        customer_identification: customerCedula.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        items,
        subtotal: subtotalTotal,
        discount: 0,
        tax_total: taxTotal,
        total: grandTotal,
        valid_until: validUntilStr,
        notes: notes.trim() || undefined,
      });
      setEditingQuote(null);
    } else {
      addQuote({
        customer_name: customerName.trim(),
        customer_identification: customerCedula.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        items,
        subtotal: subtotalTotal,
        discount: 0,
        tax_total: taxTotal,
        total: grandTotal,
        valid_until: validUntilStr,
        notes: notes.trim() || undefined,
        status: "SENT",
      });

      // Synchronize with PostgreSQL
      api.request("/quotes", {
        method: "POST",
        body: {
          customer_id: matchedCustomer?.id || undefined,
          valid_days: validDays,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            discount_percentage: 0,
          })),
        },
      }).catch(console.error);

      setIsCreateModalOpen(false);
    }
    resetForm();
  };

  const handleConvertQuoteToSale = async (q: Quote) => {
    setConvertingQuoteId(q.id);
    setConversionMessage(null);
    try {
      const resp = await api.request<any>(`/quotes/${q.id}/convert-to-sale`, {
        method: "POST",
        body: {
          payment_method: "CASH_CRC",
          cash_session_id: activeCashSession?.id || undefined,
        },
      });
      if (resp?.data) {
        setConversionMessage(`¡Cotización ${q.quote_number} convertida exitosamente a Venta ${resp.data.sale_number}!`);
        updateQuote(q.id, { status: "CONVERTED" });
      }
    } catch (err: any) {
      setConversionMessage(`Error al convertir: ${err?.message || "Verifique que la caja esté abierta y tenga stock suficiente"}`);
    } finally {
      setConvertingQuoteId(null);
    }
  };

  const handleConfirmDelete = () => {
    if (quoteToDelete) {
      deleteQuote(quoteToDelete.id);
      setQuoteToDelete(null);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer_identification && q.customer_identification.includes(search));
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Aceptada</Badge>;
      case "CONVERTED":
        return <Badge variant="blue"><FileCheck2 className="w-3 h-3 mr-1" />Facturada (POS)</Badge>;
      case "SENT":
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Enviada / Pendiente</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Rechazada</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="default">Borrador</Badge>;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Cotizaciones y Proformas</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Propuestas comerciales, proformas formales y conversión directa a facturación
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Cotización
          </Button>
        </div>

        {conversionMessage && (
          <div className="p-3 bg-primary-subtle border border-primary text-primary rounded-2xl text-xs font-bold flex items-center justify-between">
            <span>{conversionMessage}</span>
            <button
              type="button"
              onClick={() => setConversionMessage(null)}
              className="text-text-muted hover:text-text-main text-sm p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              aria-label="Buscar cotización"
              placeholder="Buscar por número (COT-...), cliente o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: "ALL", label: "Todas" },
              { key: "SENT", label: "Pendientes" },
              { key: "ACCEPTED", label: "Aceptadas" },
              { key: "CONVERTED", label: "Facturadas" },
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

        {/* Quotes Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de cotizaciones">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Nº Cotización</th>
                  <th scope="col" className="pb-3 font-bold">Cliente</th>
                  <th scope="col" className="pb-3 font-bold">Líneas</th>
                  <th scope="col" className="pb-3 font-bold">Válida Hasta</th>
                  <th scope="col" className="pb-3 font-bold">Total</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p>
                        {quotes.length === 0
                          ? "No hay cotizaciones emitidas aún. Crea tu primera proforma comercial para tus clientes."
                          : "No se encontraron cotizaciones que coincidan con la búsqueda."}
                      </p>
                      {quotes.length === 0 && (
                        <Button variant="secondary" size="sm" onClick={handleOpenCreate} className="mt-2">
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Crear Primera Cotización
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 font-mono font-bold text-primary flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {q.quote_number}
                      </td>
                      <td className="py-3 font-medium text-text-main">
                        <div>
                          <span>{q.customer_name}</span>
                          {q.customer_identification && (
                            <span className="block text-[10px] text-text-muted font-mono font-normal">
                              Céd: {q.customer_identification}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-text-secondary">
                        {q.items.length} {q.items.length === 1 ? "artículo" : "artículos"}
                      </td>
                      <td className="py-3 font-mono text-text-muted text-[11px]">{q.valid_until}</td>
                      <td className="py-3 font-black text-emerald-500 font-mono">{formatCRC(q.total)}</td>
                      <td className="py-3">{getStatusBadge(q.status)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingQuote(q)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                            title="Ver e Imprimir Proforma"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {q.customer_phone && (
                            <a
                              href={`https://wa.me/${q.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Hola ${q.customer_name}, adjuntamos su cotización ${q.quote_number} por un total de ${formatCRC(
                                  q.total
                                )} de ${settings.trade_name}. Válida hasta el ${q.valid_until}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Enviar por WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </a>
                          )}
                          {q.status !== "CONVERTED" && (
                            <button
                              type="button"
                              onClick={() => handleConvertQuoteToSale(q)}
                              disabled={convertingQuoteId === q.id}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary-subtle rounded-lg transition-colors disabled:opacity-50"
                              title="Convertir en Venta Firme en POS"
                            >
                              <ArrowRight className={`w-4 h-4 ${convertingQuoteId === q.id ? "animate-pulse text-primary" : ""}`} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setQuoteToDelete(q)}
                            className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors"
                            title="Eliminar cotización"
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

        {/* Create / Edit Quote Modal */}
        {isCreateModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}
            title="Nueva Cotización / Proforma"
            maxWidth="lg"
          >
            <form onSubmit={handleSaveQuote} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {formError}
                </div>
              )}

              {/* Customer selection */}
              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-3">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Datos del Cliente
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="quote-cust-name" className="block text-xs font-bold text-text-secondary">
                      Cliente Receptor *
                    </label>
                    <input
                      id="quote-cust-name"
                      list="customers-quote-list"
                      placeholder="Escriba o seleccione cliente..."
                      value={customerName}
                      onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                    />
                    <datalist id="customers-quote-list">
                      {customers.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.identification_number}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <Input
                    id="quote-cust-id"
                    label="Cédula Física / Jurídica / DIMEX"
                    placeholder="Ej. 101110222"
                    value={customerCedula}
                    onChange={(e) => setCustomerCedula(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="quote-cust-phone"
                    label="Teléfono / WhatsApp de Envío"
                    placeholder="+506 8888-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />

                  <Input
                    id="quote-cust-email"
                    label="Correo Electrónico"
                    type="email"
                    placeholder="cliente@correo.cr"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Items selection */}
              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl space-y-3">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Agregar Productos o Servicios
                </span>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    aria-label="Seleccionar producto del catálogo"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Seleccionar producto del catálogo --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCRC(p.sale_price)} (IVA {p.tax_rate}%)
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      aria-label="Cantidad"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main text-center focus:outline-none focus:border-primary"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddItem} disabled={!selectedProductId}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {items.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden mt-2">
                    <table className="w-full text-left text-xs" aria-label="Líneas de la cotización">
                      <thead className="bg-surface text-text-muted border-b border-border">
                        <tr>
                          <th scope="col" className="p-2">Producto</th>
                          <th scope="col" className="p-2 text-center">Cant</th>
                          <th scope="col" className="p-2">Precio Unit</th>
                          <th scope="col" className="p-2">IVA</th>
                          <th scope="col" className="p-2">Total</th>
                          <th scope="col" className="p-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium text-text-main">{it.name}</td>
                            <td className="p-2 text-center font-mono">{it.quantity}</td>
                            <td className="p-2 font-mono">{formatCRC(it.unit_price)}</td>
                            <td className="p-2 font-mono text-text-muted">{it.tax_rate}%</td>
                            <td className="p-2 font-mono font-bold text-emerald-500">{formatCRC(it.total)}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-text-muted hover:text-semantic-danger-text p-1"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals and Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="quote-validity" className="block text-xs font-bold text-text-secondary">
                      Días de Validez Comercial
                    </label>
                    <select
                      id="quote-validity"
                      value={validDays}
                      onChange={(e) => setValidDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value={8}>8 Días</option>
                      <option value={15}>15 Días (Estándar)</option>
                      <option value={30}>30 Días</option>
                      <option value={60}>60 Días</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="quote-notes" className="block text-xs font-bold text-text-secondary">
                      Términos / Notas Comerciales
                    </label>
                    <textarea
                      id="quote-notes"
                      rows={2}
                      placeholder="Ej. Entrega inmediata en Gran Área Metropolitana. Precios incluyen IVA."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-2 text-xs flex flex-col justify-center">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCRC(subtotalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>IVA Total:</span>
                    <span className="font-mono">{formatCRC(taxTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-text-main border-t border-border pt-2">
                    <span>TOTAL PROFORMA:</span>
                    <span className="font-mono text-emerald-500">{formatCRC(grandTotal)}</span>
                  </div>
                </div>
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
                  Guardar y Emitir Proforma
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* View / Print Proforma Modal */}
        {viewingQuote && (
          <Modal
            isOpen={true}
            onClose={() => setViewingQuote(null)}
            title={`Proforma Oficial — ${viewingQuote.quote_number}`}
            maxWidth="md"
          >
            <div className="space-y-4">
              <div id="proforma-print-area" className="bg-white text-black p-6 rounded-2xl border border-gray-200 text-xs font-sans space-y-4 shadow-sm">
                <div className="flex justify-between items-start border-b pb-4 border-gray-200">
                  <div>
                    <h2 className="text-base font-black uppercase text-gray-900">{settings.trade_name}</h2>
                    <p className="text-[11px] text-gray-600">{settings.legal_name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Cédula: {settings.identification_number}</p>
                    <p className="text-[10px] text-gray-500">{settings.address || "Costa Rica"}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-[10px]">
                      PROFORMA
                    </span>
                    <p className="text-sm font-black font-mono text-gray-900 mt-1">{viewingQuote.quote_number}</p>
                    <p className="text-[10px] text-gray-500">Fecha: {viewingQuote.created_at}</p>
                    <p className="text-[10px] text-red-600 font-bold">Válida hasta: {viewingQuote.valid_until}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-[11px]">
                  <p><strong>Cliente:</strong> {viewingQuote.customer_name}</p>
                  {viewingQuote.customer_identification && (
                    <p><strong>Cédula:</strong> <span className="font-mono">{viewingQuote.customer_identification}</span></p>
                  )}
                  {viewingQuote.customer_phone && <p><strong>Teléfono:</strong> {viewingQuote.customer_phone}</p>}
                </div>

                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-300 font-bold text-gray-700">
                      <th className="pb-1">Descripción</th>
                      <th className="pb-1 text-center">Cant</th>
                      <th className="pb-1 text-right">Precio</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewingQuote.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 font-medium">{it.name}</td>
                        <td className="py-1.5 text-center font-mono">{it.quantity}</td>
                        <td className="py-1.5 text-right font-mono">{formatCRC(it.unit_price)}</td>
                        <td className="py-1.5 text-right font-mono font-bold">{formatCRC(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-gray-300 pt-2 space-y-1 text-[11px] text-right font-mono">
                  <p>Subtotal: {formatCRC(viewingQuote.subtotal)}</p>
                  <p>IVA: {formatCRC(viewingQuote.tax_total)}</p>
                  <p className="text-sm font-black text-gray-900 border-t pt-1">TOTAL: {formatCRC(viewingQuote.total)}</p>
                </div>

                {viewingQuote.notes && (
                  <p className="text-[10px] text-gray-500 italic border-t pt-2">
                    Nota: {viewingQuote.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setViewingQuote(null)}>
                  Cerrar
                </Button>
                <Button variant="primary" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-4 h-4" />
                  Imprimir Proforma
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {quoteToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setQuoteToDelete(null)}
            title="Confirmar Eliminación de Cotización"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar la cotización <strong>{quoteToDelete.quote_number}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setQuoteToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Cotización
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}