"use client";

import React, { useState } from "react";
import {
  Building,
  MapPin,
  Store,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/features/store/store-context";
import { Branch } from "@/types";

export default function BranchesPage() {
  const { branches, settings, addBranch, updateBranch, deleteBranch } = useStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // Form
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    const nextCodeNumber = branches.length + 1;
    const paddedCode = String(nextCodeNumber).padStart(3, "0");
    setBranchName("");
    setBranchCode(paddedCode);
    setBranchAddress("");
    setBranchPhone("");
    setIsActive(true);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (br: Branch) => {
    setEditingBranch(br);
    setBranchName(br.name);
    setBranchCode(br.code);
    setBranchAddress(br.address || "");
    setBranchPhone(br.phone || "");
    setIsActive(br.is_active);
    setFormError(null);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!branchName.trim()) {
      setFormError("El nombre de la sucursal es obligatorio.");
      return;
    }

    if (!branchCode.trim()) {
      setFormError("El código de sucursal de Hacienda (ej: 001, 002) es obligatorio.");
      return;
    }

    if (editingBranch) {
      updateBranch(editingBranch.id, {
        name: branchName.trim(),
        code: branchCode.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        is_active: isActive,
      });
      setEditingBranch(null);
    } else {
      addBranch({
        name: branchName.trim(),
        code: branchCode.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        is_main: branches.length === 0,
        is_active: isActive,
      });
      setIsCreateModalOpen(false);
    }
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (branchToDelete) {
      deleteBranch(branchToDelete.id);
      setBranchToDelete(null);
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Sucursales y Locales Comerciales</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Administración de sucursales físicas y códigos de emisión ante Hacienda CR
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Sucursal
          </Button>
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((b, idx) => (
            <Card
              key={b.id}
              className={`p-5 rounded-3xl flex flex-col justify-between space-y-4 transition-all ${
                b.is_main ? "border-l-4 border-l-primary" : "border border-border"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-main">{b.name}</h3>
                      <span className="text-[10px] text-text-muted font-mono font-semibold">
                        Código Hacienda: {b.code}
                      </span>
                    </div>
                  </div>
                  <Badge variant={b.is_main ? "blue" : b.is_active ? "success" : "default"}>
                    {b.is_main ? "Principal" : b.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-text-muted pt-1">
                  <div className="flex items-start gap-1.5 text-text-secondary">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed">
                      {b.address || (b.is_main && settings.address) || "Dirección no especificada"}
                    </span>
                  </div>

                  {b.phone && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Phone className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="text-[11px] font-mono">{b.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Punto de Venta Operativo
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    title="Editar sucursal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!b.is_main && (
                    <button
                      type="button"
                      onClick={() => setBranchToDelete(b)}
                      className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                      title="Eliminar sucursal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Create / Edit Branch Modal */}
        {(isCreateModalOpen || editingBranch) && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingBranch(null);
              resetForm();
            }}
            title={editingBranch ? "Editar Sucursal" : "Registrar Nueva Sucursal"}
            maxWidth="md"
          >
            <form onSubmit={handleSaveBranch} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {formError}
                </div>
              )}

              <Input
                id="br-name"
                label="Nombre de la Sucursal *"
                placeholder="Ej. Sucursal Curridabat / Plaza Lincoln"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="br-code"
                  label="Código de Sucursal Hacienda (3 dígitos) *"
                  placeholder="002"
                  maxLength={3}
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  required
                />

                <Input
                  id="br-phone"
                  label="Teléfono de la Sucursal"
                  placeholder="+506 2200-0000"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                />
              </div>

              <Input
                id="br-address"
                label="Dirección Física Exacta (Provincia, Cantón, Distrito)"
                placeholder="Ej. San José, Montes de Oca, San Pedro, Costado Este del Parque"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="br-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="br-active" className="text-xs font-semibold text-text-main cursor-pointer">
                  Sucursal Activa para ventas y facturación
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingBranch(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {branchToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setBranchToDelete(null)}
            title="Confirmar Eliminación de Sucursal"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar la sucursal <strong>{branchToDelete.name}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setBranchToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Eliminar Sucursal
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}