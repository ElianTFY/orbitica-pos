"use client";

import React, { useState } from "react";
import {
  UserCog,
  UserPlus,
  Search,
  Mail,
  Phone,
  Shield,
  Users,
  Edit2,
  Trash2,
  Lock,
  Building,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/features/store/store-context";
import { Employee } from "@/types";

export default function EmployeesPage() {
  const { employees, branches, settings, addEmployee, updateEmployee, deleteEmployee } = useStore();
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"CASHIER" | "MANAGER" | "INVENTORY" | "ADMIN">("CASHIER");
  const [branchName, setBranchName] = useState(settings.branch_name || "Sucursal Central (001)");
  const [pin, setPin] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("CASHIER");
    setBranchName(settings.branch_name || "Sucursal Central (001)");
    setPin("");
    setIsActive(true);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFullName(emp.full_name);
    setEmail(emp.email);
    setPhone(emp.phone || "");
    setRole(emp.role);
    setBranchName(emp.branch_name);
    setPin(emp.pin || "");
    setIsActive(emp.is_active);
    setFormError(null);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError("El nombre completo del empleado es obligatorio.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setFormError("Ingrese un correo electrónico válido para el empleado.");
      return;
    }

    if (pin && pin.length < 4) {
      setFormError("El PIN de acceso rápido al POS debe tener al menos 4 dígitos.");
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        branch_name: branchName,
        pin: pin.trim(),
        is_active: isActive,
      });
      setEditingEmployee(null);
    } else {
      addEmployee({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        branch_name: branchName,
        pin: pin.trim(),
        is_active: isActive,
      });
      setIsCreateModalOpen(false);
    }
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployee(employeeToDelete.id);
      setEmployeeToDelete(null);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.phone && e.phone.includes(search)) ||
      e.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "ADMIN":
        return { label: "Administrador", variant: "blue" as const };
      case "MANAGER":
        return { label: "Gerente", variant: "warning" as const };
      case "INVENTORY":
        return { label: "Inventario", variant: "default" as const };
      case "CASHIER":
      default:
        return { label: "Cajero POS", variant: "success" as const };
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Gestión de Empleados y Personal</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Control de accesos, roles de cajero y permisos de usuarios
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar Empleado
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar empleado por nombre, correo o rol"
            placeholder="Buscar por nombre, correo electrónico o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          />
        </div>

        {/* Employees Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Tabla de empleados">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th scope="col" className="pb-3 font-bold">Empleado</th>
                  <th scope="col" className="pb-3 font-bold">Rol / Permiso</th>
                  <th scope="col" className="pb-3 font-bold">Sucursal Asignada</th>
                  <th scope="col" className="pb-3 font-bold">Contacto</th>
                  <th scope="col" className="pb-3 font-bold">PIN POS</th>
                  <th scope="col" className="pb-3 font-bold">Estado</th>
                  <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <p>
                        {employees.length === 0
                          ? "No tienes empleados registrados aún. Registra a tus cajeros o personal de inventario para asignar accesos."
                          : "No se encontraron empleados que coincidan con la búsqueda."}
                      </p>
                      {employees.length === 0 && (
                        <Button variant="secondary" size="sm" onClick={handleOpenCreate} className="mt-2">
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Registrar Primer Empleado
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const roleInfo = getRoleLabel(emp.role);
                    return (
                      <tr key={emp.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3">
                          <div className="font-bold text-text-main flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {emp.full_name.charAt(0)}
                            </div>
                            <div>
                              <span>{emp.full_name}</span>
                              <span className="block text-[10px] text-text-muted font-normal font-mono">{emp.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
                        </td>
                        <td className="py-3 text-text-secondary flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-text-muted" />
                          <span>{emp.branch_name}</span>
                        </td>
                        <td className="py-3 font-mono text-text-muted text-[11px]">
                          {emp.phone ? emp.phone : "-"}
                        </td>
                        <td className="py-3 font-mono text-text-muted text-[11px]">
                          {emp.pin ? "••••" : "Sin PIN"}
                        </td>
                        <td className="py-3">
                          <Badge variant={emp.is_active ? "success" : "default"}>
                            {emp.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                              title="Editar empleado"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                              title="Eliminar empleado"
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

        {/* Create / Edit Employee Modal */}
        {(isCreateModalOpen || editingEmployee) && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingEmployee(null);
              resetForm();
            }}
            title={editingEmployee ? "Editar Empleado" : "Registrar Nuevo Empleado"}
            maxWidth="md"
          >
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {formError}
                </div>
              )}

              <Input
                id="emp-name"
                label="Nombre Completo *"
                placeholder="Ej. Carlos Mora Rojas"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="emp-email"
                  label="Correo Electrónico *"
                  type="email"
                  placeholder="carlos@negocio.cr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  id="emp-phone"
                  label="Teléfono / WhatsApp"
                  placeholder="+506 8888-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="emp-role" className="block text-xs font-bold text-text-secondary">
                    Rol en el Sistema *
                  </label>
                  <select
                    id="emp-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="CASHIER">Cajero (POS y Cobro)</option>
                    <option value="INVENTORY">Inventario (Stock y Compras)</option>
                    <option value="MANAGER">Gerente (Reportes y Caja)</option>
                    <option value="ADMIN">Administrador (Total)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-branch" className="block text-xs font-bold text-text-secondary">
                    Sucursal Asignada *
                  </label>
                  <select
                    id="emp-branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    {branches.length > 0 ? (
                      branches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} ({b.code})
                        </option>
                      ))
                    ) : (
                      <option value={settings.branch_name}>{settings.branch_name}</option>
                    )}
                  </select>
                </div>
              </div>

              <Input
                id="emp-pin"
                label="PIN de Acceso Rápido POS (Opcional - 4 dígitos)"
                type="password"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="emp-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="emp-active" className="text-xs font-semibold text-text-main cursor-pointer">
                  Empleado Activo (Permite iniciar sesión en el POS)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {editingEmployee ? "Guardar Cambios" : "Registrar Empleado"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {employeeToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setEmployeeToDelete(null)}
            title="Confirmar Eliminación de Empleado"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar al empleado <strong>{employeeToDelete.full_name}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setEmployeeToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Empleado
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}