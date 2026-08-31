"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Edit2,
  UserPlus,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { Customer } from "@/types";

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, settings } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [idType, setIdType] = useState<"FISICA" | "JURIDICA" | "DIMEX" | "EXTRANJERO">("FISICA");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName("");
    setIdType("FISICA");
    setIdNumber("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setIdType(c.identification_type);
    setIdNumber(c.identification_number);
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setAddress(c.address || "");
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name,
        identification_type: idType,
        identification_number: idNumber,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });
    } else {
      addCustomer({
        name,
        identification_type: idType,
        identification_number: idNumber,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        is_active: true,
      });
    }
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identification_number.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Directorio de Clientes ({customers.length})</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Clientes para emisión de Facturas Electrónicas (01) en Costa Rica
            </p>
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar cliente por nombre o cédula"
            placeholder="Buscar cliente por nombre, cédula o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Customers Table or Clean Empty State */}
        {customers.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">Aún no has registrado clientes</h2>
              <p className="text-xs text-text-muted">
                Registra los datos tributarios de tus clientes frecuentes para seleccionarlos con 1 clic al emitir Facturas Electrónicas.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primer Cliente
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de clientes">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Cliente / Razón Social</th>
                    <th scope="col" className="pb-3 font-bold">Identificación</th>
                    <th scope="col" className="pb-3 font-bold">Contacto</th>
                    <th scope="col" className="pb-3 font-bold">Dirección</th>
                    <th scope="col" className="pb-3 font-bold">Estado</th>
                    <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        No se encontraron clientes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-bold text-text-main flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary-subtle border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate max-w-xs">{c.name}</span>
                        </td>
                        <td className="py-3 font-mono text-text-secondary text-[11px]">
                          <div>{c.identification_number}</div>
                          <span className="text-[10px] text-text-muted">{c.identification_type}</span>
                        </td>
                        <td className="py-3 text-text-secondary">
                          {c.email && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Mail className="w-3 h-3 text-text-muted" />
                              <span>{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-text-muted">
                              <Phone className="w-3 h-3" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-text-secondary max-w-[200px] truncate">
                          {c.address || "-"}
                        </td>
                        <td className="py-3">
                          <Badge variant="success">Activo</Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              aria-label={`Editar ${c.name}`}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCustomer(c.id)}
                              aria-label={`Eliminar ${c.name}`}
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

      {/* Modal Crear / Editar Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre o Razón Social"
            placeholder="Ej: Distribuidora Sol Naciente S.A."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Tipo de Cédula
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="FISICA">Cédula Física (9 dígitos)</option>
                <option value="JURIDICA">Cédula Jurídica (10 dígitos)</option>
                <option value="DIMEX">DIMEX (11-12 dígitos)</option>
                <option value="EXTRANJERO">Extranjero / Pasaporte</option>
              </select>
            </div>

            <Input
              label="Número de Identificación"
              placeholder="115000888"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Correo Electrónico (Para Facturas)"
              type="email"
              placeholder="facturas@cliente.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Teléfono"
              placeholder="8888-1122"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Dirección Física"
            placeholder="San José, Costa Rica"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}