"use client";

import React, { useState } from "react";
import { Truck, Plus, Search, Mail, Phone, MapPin, Trash2, Edit2, PackagePlus } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { Supplier } from "@/types";

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, settings } = useStore();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [legalId, setLegalId] = useState("");
  const [legalIdType, setLegalIdType] = useState<"JURIDICA" | "FISICA" | "DIMEX">("JURIDICA");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setLegalId("");
    setLegalIdType("JURIDICA");
    setContact("");
    setPhone("");
    setEmail("");
    setAddress("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setLegalId(s.legal_id);
    setLegalIdType(s.legal_id_type);
    setContact(s.contact_person || "");
    setPhone(s.phone || "");
    setEmail(s.email || "");
    setAddress(s.address || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const validateLegalId = (type: string, val: string): boolean => {
    const clean = val.replace(/\D/g, "");
    if (type === "FISICA") return clean.length === 9;
    if (type === "JURIDICA") return clean.length === 10;
    if (type === "DIMEX") return clean.length >= 11 && clean.length <= 12;
    return clean.length >= 5;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = legalId.replace(/\D/g, "");
    if (!validateLegalId(legalIdType, cleanId)) {
      if (legalIdType === "FISICA") setFormError("La cédula física debe tener exactamente 9 dígitos numéricos.");
      else if (legalIdType === "JURIDICA") setFormError("La cédula jurídica debe tener exactamente 10 dígitos numéricos.");
      else if (legalIdType === "DIMEX") setFormError("El DIMEX debe tener entre 11 y 12 dígitos numéricos.");
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: name.trim(),
        legal_id: cleanId,
        legal_id_type: legalIdType,
        contact_person: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
    } else {
      addSupplier({
        name: name.trim(),
        legal_id: cleanId,
        legal_id_type: legalIdType,
        contact_person: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.legal_id.includes(search) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Proveedores y Distribuidores ({suppliers.length})</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Directorio de proveedores para compras y reposición de inventario
            </p>
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proveedor
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar proveedor por nombre o cédula"
            placeholder="Buscar por nombre, cédula jurídica o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Suppliers Table or Clean Empty State */}
        {suppliers.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Truck className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">Aún no has registrado proveedores</h2>
              <p className="text-xs text-text-muted">
                Registra a tus distribuidores y casas comerciales para asociar las facturas de compra y entradas de stock.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primer Proveedor
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de proveedores">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Proveedor</th>
                    <th scope="col" className="pb-3 font-bold">Cédula / Identificación</th>
                    <th scope="col" className="pb-3 font-bold">Contacto / Agente</th>
                    <th scope="col" className="pb-3 font-bold">Teléfono / Correo</th>
                    <th scope="col" className="pb-3 font-bold">Dirección</th>
                    <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        No se encontraron proveedores que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-bold text-text-main flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary-subtle border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate max-w-xs">{s.name}</span>
                        </td>
                        <td className="py-3 font-mono text-text-secondary text-[11px]">
                          <div>{s.legal_id}</div>
                          <span className="text-[10px] text-text-muted">{s.legal_id_type}</span>
                        </td>
                        <td className="py-3 text-text-secondary">{s.contact_person || "-"}</td>
                        <td className="py-3 text-text-secondary">
                          {s.phone && <div className="text-[11px]">{s.phone}</div>}
                          {s.email && <div className="text-text-muted text-[10px]">{s.email}</div>}
                        </td>
                        <td className="py-3 text-text-secondary max-w-[200px] truncate">{s.address || "-"}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(s)}
                              aria-label={`Editar ${s.name}`}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSupplierToDelete(s)}
                              aria-label={`Eliminar ${s.name}`}
                              className="p-1.5 text-text-muted hover:text-red-500 hover:bg-semantic-danger-bg rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Modal Crear / Editar Proveedor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Nombre o Razón Social del Proveedor"
            placeholder="Ej: Distribuidora La Florida S.A."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Tipo de Identificación
              </label>
              <select
                value={legalIdType}
                onChange={(e) => setLegalIdType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="JURIDICA">Cédula Jurídica (10 dígitos)</option>
                <option value="FISICA">Cédula Física (9 dígitos)</option>
                <option value="DIMEX">DIMEX (11-12 dígitos)</option>
              </select>
            </div>

            <Input
              label="Número de Cédula"
              placeholder="3101112233"
              value={legalId}
              onChange={(e) => setLegalId(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Persona de Contacto / Agente"
              placeholder="Carlos Venta Directa"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <Input
              label="Teléfono"
              placeholder="2430-1000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Correo Electrónico de Pedidos"
            type="email"
            placeholder="pedidos@proveedor.cr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Dirección de Despacho"
            placeholder="Alajuela, Costa Rica"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingSupplier ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {supplierToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setSupplierToDelete(null)}
          title="Confirmar Eliminación"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted leading-relaxed">
              ¿Estás seguro de que deseas eliminar al proveedor{" "}
              <strong className="text-text-main">{supplierToDelete.name}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setSupplierToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Eliminar Proveedor
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  );
}