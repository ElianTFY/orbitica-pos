"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  FileCheck,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

interface CustomerRecord {
  id: string;
  name: string;
  identification_type: "FISICA" | "JURIDICA" | "DIMEX" | "EXTRANJERO";
  identification_number: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

const DEMO_CUSTOMERS: CustomerRecord[] = [
  { id: "1", name: "Corporación El Lago S.A.", identification_type: "JURIDICA", identification_number: "3101998877", email: "facturas@ellago.cr", phone: "2222-3344", address: "San José, Costa Rica", is_active: true },
  { id: "2", name: "Juan Mora Fernández", identification_type: "FISICA", identification_number: "115000888", email: "juan.mora@costarica.cr", phone: "8888-1122", address: "Escazú, San José", is_active: true },
  { id: "3", name: "María Brenes Rojas", identification_type: "FISICA", identification_number: "207000333", email: "maria.brenes@email.cr", phone: "8765-4321", address: "Alajuela Centro", is_active: true },
  { id: "4", name: "Pierre Dubois", identification_type: "DIMEX", identification_number: "155800099999", email: "pierre@dubois.fr", phone: "6000-9988", address: "Santa Ana", is_active: true },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(DEMO_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [idType, setIdType] = useState<"FISICA" | "JURIDICA" | "DIMEX" | "EXTRANJERO">("FISICA");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identification_number.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: CustomerRecord = {
      id: Date.now().toString(),
      name,
      identification_type: idType,
      identification_number: idNumber,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      is_active: true,
    };
    setCustomers([newCust, ...customers]);
    setIsNewModalOpen(false);
    setName("");
    setIdNumber("");
    setEmail("");
    setPhone("");
    setAddress("");
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Directorio de Clientes</h1>
            <p className="text-xs text-[#8E929E]">Gestión de clientes y datos fiscales para facturación electrónica</p>
          </div>
          <Button variant="primary" onClick={() => setIsNewModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o correo electrónico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#141518] border border-[#26282E] rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF]"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8E929E] border-b border-[#26282E]">
                  <th className="pb-3">Nombre / Razón Social</th>
                  <th className="pb-3">Tipo Identificación</th>
                  <th className="pb-3">Nº Cédula / Identificación</th>
                  <th className="pb-3">Correo Factura Electrónica</th>
                  <th className="pb-3">Teléfono</th>
                  <th className="pb-3">Dirección</th>
                  <th className="pb-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                    <td className="py-3 font-semibold text-white">{c.name}</td>
                    <td className="py-3">
                      <Badge variant="blue">{c.identification_type}</Badge>
                    </td>
                    <td className="py-3 font-mono font-bold text-white">{c.identification_number}</td>
                    <td className="py-3 text-[#CFCFD4]">{c.email || "-"}</td>
                    <td className="py-3 text-[#8E929E] font-mono">{c.phone || "-"}</td>
                    <td className="py-3 text-[#8E929E] max-w-xs truncate">{c.address || "-"}</td>
                    <td className="py-3 text-center">
                      <Badge variant="success">Activo</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Registrar Cliente para Facturación" maxWidth="md">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Nombre Completo o Razón Social"
            placeholder="Ej: Distribuidora Central S.A."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CFCFD4]">Tipo de Identificación CR</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]"
              >
                <option value="FISICA">Cédula Física (9 dígitos)</option>
                <option value="JURIDICA">Cédula Jurídica (10 dígitos)</option>
                <option value="DIMEX">DIMEX (11-12 dígitos)</option>
                <option value="EXTRANJERO">Extranjero / Pasaporte</option>
              </select>
            </div>

            <Input
              label="Número de Identificación"
              placeholder="Ej: 3101998877"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Correo Electrónico (Para Factura)"
              type="email"
              placeholder="facturacion@cliente.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Teléfono"
              placeholder="8888-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Dirección Física (Opcional)"
            placeholder="Provincia, Cantón, Distrito o Señas"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="pt-3 border-t border-[#26282E] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Cliente
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}