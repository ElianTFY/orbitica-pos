"use client";

import React, { useState } from "react";
import { Truck, Plus, Search } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface SupplierRecord {
  id: string;
  name: string;
  legal_id: string;
  legal_id_type: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const DEMO_SUPPLIERS: SupplierRecord[] = [
  { id: "1", name: "Distribuidora La Florida S.A.", legal_id: "3101112233", legal_id_type: "JURIDICA", contact_person: "Carlos Venta Directa", phone: "2430-1000", email: "ventas@laflorida.cr", address: "Alajuela, Costa Rica" },
  { id: "2", name: "Corporación Dos Pinos R.L.", legal_id: "3004045000", legal_id_type: "JURIDICA", contact_person: "Agente de Ruta", phone: "2437-3000", email: "pedidos@dospinos.com", address: "El Coyol, Alajuela" },
  { id: "3", name: "Coca-Cola FEMSA Costa Rica", legal_id: "3101098765", legal_id_type: "JURIDICA", contact_person: "Despacho Central", phone: "2298-4000", email: "pedidos@femsa.cr", address: "Calle Blancos, San José" },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(DEMO_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [legalId, setLegalId] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const newS: SupplierRecord = {
      id: Date.now().toString(),
      name,
      legal_id: legalId,
      legal_id_type: "JURIDICA",
      contact_person: contact || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
    };
    setSuppliers([newS, ...suppliers]);
    setIsModalOpen(false);
    setName("");
    setLegalId("");
    setContact("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.legal_id.includes(search)
  );

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Directorio de Proveedores</h1>
            <p className="text-xs text-[#8E929E]">Gestión de proveedores comerciales y órdenes de suministro</p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proveedor
          </Button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Buscar por nombre de empresa o cédula jurídica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#141518] border border-[#26282E] rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF]"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8E929E] border-b border-[#26282E]">
                  <th className="pb-3">Empresa / Razón Social</th>
                  <th className="pb-3">Cédula Jurídica</th>
                  <th className="pb-3">Contacto Comercial</th>
                  <th className="pb-3">Teléfono</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-semibold text-white">{s.name}</td>
                    <td className="py-3 font-mono font-bold text-[#0EA5FF]">{s.legal_id}</td>
                    <td className="py-3 text-[#CFCFD4]">{s.contact_person || "-"}</td>
                    <td className="py-3 font-mono text-[#8E929E]">{s.phone || "-"}</td>
                    <td className="py-3 text-[#8E929E]">{s.email || "-"}</td>
                    <td className="py-3 text-[#8E929E] max-w-xs truncate">{s.address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Proveedor" maxWidth="md">
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <Input
            label="Razón Social o Nombre Comercial"
            placeholder="Ej: Distribuidora Central S.A."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cédula Jurídica / Física"
              placeholder="3101112233"
              value={legalId}
              onChange={(e) => setLegalId(e.target.value)}
              required
            />
            <Input
              label="Contacto Comercial (Opcional)"
              placeholder="Ej: Juan Pérez"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="2222-3344"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="pedidos@proveedor.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Dirección / Bodega"
            placeholder="Provincia, Cantón o Señas"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-3 border-t border-[#26282E] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Proveedor
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}