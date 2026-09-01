"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Tag,
  Gift,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertTriangle,
  Copy,
  Percent,
  DollarSign,
  Award,
  Users,
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
import { Coupon, LoyaltyMember } from "@/types";

export default function LoyaltyPage() {
  const {
    coupons,
    loyaltyMembers,
    customers,
    settings,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"COUPONS" | "LOYALTY">("COUPONS");
  const [search, setSearch] = useState("");

  // Coupon Modals
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Form State for Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponDesc, setCouponDesc] = useState("");
  const [discountType, setDiscountType] = useState<Coupon["discount_type"]>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [minPurchase, setMinPurchase] = useState<number | "">("");
  const [maxUses, setMaxUses] = useState<number | "">("");
  const [validUntil, setValidUntil] = useState("");
  const [couponFormError, setCouponFormError] = useState<string | null>(null);

  // Loyalty Add Points Modal
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);
  const [pointsDelta, setPointsDelta] = useState<number | "">("");
  const [pointsAction, setPointsAction] = useState<"ADD" | "REDEEM">("ADD");
  const [pointsError, setPointsError] = useState<string | null>(null);

  const resetCouponForm = () => {
    setCouponCode("");
    setCouponDesc("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("");
    setMinPurchase("");
    setMaxUses("");
    setValidUntil("");
    setCouponFormError(null);
    setEditingCoupon(null);
  };

  const handleOpenCreateCoupon = () => {
    resetCouponForm();
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coup: Coupon) => {
    setEditingCoupon(coup);
    setCouponCode(coup.code);
    setCouponDesc(coup.description);
    setDiscountType(coup.discount_type);
    setDiscountValue(coup.discount_value);
    setMinPurchase(coup.min_purchase);
    setMaxUses(coup.max_uses);
    setValidUntil(coup.valid_until);
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);

    const codeClean = couponCode.trim().toUpperCase();
    if (!codeClean) {
      setCouponFormError("El código de cupón es obligatorio (Ej. PROMO10).");
      return;
    }
    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      setCouponFormError("El valor de descuento debe ser mayor a 0.");
      return;
    }

    if (discountType === "PERCENTAGE" && val > 100) {
      setCouponFormError("El porcentaje de descuento no puede ser mayor a 100%.");
      return;
    }

    const todayStr = new Date().toISOString().replace("T", " ").substring(0, 10);
    const validUntilStr = validUntil || "2030-12-31";

    if (editingCoupon) {
      updateCoupon(editingCoupon.id, {
        code: codeClean,
        description: couponDesc.trim() || `Descuento ${codeClean}`,
        discount_type: discountType,
        discount_value: val,
        min_purchase: Number(minPurchase) || 0,
        max_uses: Number(maxUses) || 9999,
        valid_until: validUntilStr,
      });
    } else {
      addCoupon({
        code: codeClean,
        description: couponDesc.trim() || `Descuento ${codeClean}`,
        discount_type: discountType,
        discount_value: val,
        min_purchase: Number(minPurchase) || 0,
        max_uses: Number(maxUses) || 9999,
        current_uses: 0,
        valid_from: todayStr,
        valid_until: validUntilStr,
        is_active: true,
      });
    }

    setIsCouponModalOpen(false);
    resetCouponForm();
  };

  const handleConfirmDeleteCoupon = () => {
    if (couponToDelete) {
      deleteCoupon(couponToDelete.id);
      setCouponToDelete(null);
    }
  };

  const handleSavePoints = (e: React.FormEvent) => {
    e.preventDefault();
    setPointsError(null);
    if (!selectedMember) return;

    const numPoints = Number(pointsDelta);
    if (isNaN(numPoints) || numPoints <= 0) {
      setPointsError("Ingresa una cantidad de puntos válida mayor a 0.");
      return;
    }

    if (pointsAction === "ADD") {
      addLoyaltyPoints(selectedMember.customer_phone, selectedMember.customer_name, numPoints);
    } else {
      const ok = redeemLoyaltyPoints(selectedMember.customer_phone, numPoints);
      if (!ok) {
        setPointsError(`El cliente solo cuenta con ${selectedMember.points_balance} puntos disponibles.`);
        return;
      }
    }

    setIsPointsModalOpen(false);
    setSelectedMember(null);
    setPointsDelta("");
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = loyaltyMembers.filter((m) =>
    m.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    m.customer_phone.includes(search)
  );

  const getTierBadge = (tier: LoyaltyMember["tier"]) => {
    const colors: Record<string, string> = {
      DIAMANTE: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      ORO: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      PLATA: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      BRONCE: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[tier] || colors.BRONCE}`}>
        ★ {tier}
      </span>
    );
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Fidelidad y Cupones Promocionales</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Campañas de fidelización, acumulación de puntos y cupones de descuento POS
            </p>
          </div>
          {activeTab === "COUPONS" ? (
            <Button variant="primary" onClick={handleOpenCreateCoupon} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Cupón
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                if (customers.length > 0) {
                  const first = customers[0];
                  addLoyaltyPoints(first.phone || "88880000", first.name, 100);
                }
              }}
              className="gap-2"
              disabled={customers.length === 0}
            >
              <Award className="w-4 h-4" />
              Inscribir Cliente en Puntos
            </Button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("COUPONS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "COUPONS"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main hover:bg-surface-secondary"
            }`}
          >
            <Tag className="w-4 h-4" />
            Cupones de Descuento ({coupons.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOYALTY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "LOYALTY"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main hover:bg-surface-secondary"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Club de Fidelidad & Puntos ({loyaltyMembers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            aria-label="Buscar"
            placeholder={
              activeTab === "COUPONS"
                ? "Buscar por código de cupón o descripción..."
                : "Buscar cliente por nombre o teléfono..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary shadow-sm"
          />
        </div>

        {/* Tab 1: Coupons */}
        {activeTab === "COUPONS" && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de cupones de descuento">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Código de Cupón</th>
                    <th scope="col" className="pb-3 font-bold">Descripción</th>
                    <th scope="col" className="pb-3 font-bold">Descuento</th>
                    <th scope="col" className="pb-3 font-bold">Compra Mínima</th>
                    <th scope="col" className="pb-3 font-bold">Usos</th>
                    <th scope="col" className="pb-3 font-bold">Válido Hasta</th>
                    <th scope="col" className="pb-3 font-bold">Estado</th>
                    <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-muted space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                          <Tag className="w-6 h-6" />
                        </div>
                        <p>
                          {coupons.length === 0
                            ? "No has creado cupones de descuento. Crea tu primera campaña promocional para fidelizar clientes."
                            : "No se encontraron cupones que coincidan con la búsqueda."}
                        </p>
                        {coupons.length === 0 && (
                          <Button variant="secondary" size="sm" onClick={handleOpenCreateCoupon} className="mt-2">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Crear Primer Cupón
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-mono font-black text-primary flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          {c.code}
                        </td>
                        <td className="py-3 text-text-main font-medium">{c.description}</td>
                        <td className="py-3 font-bold text-emerald-500 font-mono">
                          {c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : formatCRC(c.discount_value)}
                        </td>
                        <td className="py-3 font-mono text-text-secondary">{formatCRC(c.min_purchase)}</td>
                        <td className="py-3 font-mono text-text-muted">
                          {c.current_uses} / {c.max_uses >= 9999 ? "∞" : c.max_uses}
                        </td>
                        <td className="py-3 font-mono text-text-muted text-[11px]">{c.valid_until}</td>
                        <td className="py-3">
                          {c.is_active ? (
                            <Badge variant="success">Activo</Badge>
                          ) : (
                            <Badge variant="default">Inactivo</Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                updateCoupon(c.id, { is_active: !c.is_active });
                              }}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                              title={c.is_active ? "Desactivar" : "Activar"}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCoupon(c)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                              title="Editar cupón"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCouponToDelete(c)}
                              className="p-1.5 text-text-muted hover:text-semantic-danger-text hover:bg-semantic-danger-bg rounded-lg transition-colors"
                              title="Eliminar cupón"
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
        )}

        {/* Tab 2: Loyalty Program */}
        {activeTab === "LOYALTY" && (
          <div className="space-y-4">
            {/* Rule Explainer Card */}
            <Card className="p-4 bg-gradient-to-r from-primary-subtle to-surface border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-main">Regla Activa de Fidelidad</h3>
                  <p className="text-[11px] text-text-muted">
                    Los clientes acumulan <strong>1 punto por cada ₡1.000 consumidos</strong>. 100 puntos equivalen a ₡1.000 de descuento aplicable en caja.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary font-mono bg-surface px-3 py-1.5 rounded-xl border border-border">
                  1 pt = ₡10 de canje
                </span>
              </div>
            </Card>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Tabla del club de fidelidad">
                  <thead>
                    <tr className="text-text-muted border-b border-border">
                      <th scope="col" className="pb-3 font-bold">Cliente</th>
                      <th scope="col" className="pb-3 font-bold">Teléfono / WhatsApp</th>
                      <th scope="col" className="pb-3 font-bold">Nivel / Rango</th>
                      <th scope="col" className="pb-3 font-bold">Puntos Disponibles</th>
                      <th scope="col" className="pb-3 font-bold">Histórico Total</th>
                      <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-text-muted space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                            <Users className="w-6 h-6" />
                          </div>
                          <p>No hay clientes registrados en el programa de puntos aún.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-surface-hover transition-colors">
                          <td className="py-3 font-bold text-text-main">{m.customer_name}</td>
                          <td className="py-3 font-mono text-text-secondary">{m.customer_phone}</td>
                          <td className="py-3">{getTierBadge(m.tier)}</td>
                          <td className="py-3 font-mono font-black text-primary text-sm">
                            {m.points_balance} pts{" "}
                            <span className="text-[10px] text-emerald-500 font-normal">
                              (≈ {formatCRC(m.points_balance * 10)})
                            </span>
                          </td>
                          <td className="py-3 font-mono text-text-muted">{m.total_earned} pts</td>
                          <td className="py-3 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(m);
                                setIsPointsModalOpen(true);
                              }}
                            >
                              Gestionar Puntos
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Create Coupon */}
        {isCouponModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCouponModalOpen(false);
              resetCouponForm();
            }}
            title={editingCoupon ? "Editar Cupón Promocional" : "Crear Nuevo Cupón de Descuento"}
            maxWidth="md"
          >
            <form onSubmit={handleSaveCoupon} className="space-y-4">
              {couponFormError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {couponFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="coup-code"
                  label="Código del Cupón (Mayúsculas) *"
                  placeholder="Ej. PROMO10 / VERANO2026"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  required
                />

                <div className="space-y-1.5">
                  <label htmlFor="coup-type" className="block text-xs font-bold text-text-secondary">
                    Tipo de Descuento *
                  </label>
                  <select
                    id="coup-type"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as Coupon["discount_type"])}
                    className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED_AMOUNT">Monto Fijo (₡ CRC)</option>
                  </select>
                </div>
              </div>

              <Input
                id="coup-desc"
                label="Descripción Promocional *"
                placeholder="Ej. 10% de descuento en toda la tienda"
                value={couponDesc}
                onChange={(e) => setCouponDesc(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  id="coup-val"
                  label={discountType === "PERCENTAGE" ? "Porcentaje (%) *" : "Monto Fijo (CRC) *"}
                  type="number"
                  placeholder={discountType === "PERCENTAGE" ? "10" : "2000"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />

                <Input
                  id="coup-min"
                  label="Compra Mínima (CRC)"
                  type="number"
                  placeholder="0.00"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                />

                <Input
                  id="coup-until"
                  label="Válido Hasta"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCouponModalOpen(false);
                    resetCouponForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {editingCoupon ? "Actualizar Cupón" : "Crear Cupón"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Points Management */}
        {isPointsModalOpen && selectedMember && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsPointsModalOpen(false);
              setSelectedMember(null);
            }}
            title={`Gestión de Puntos — ${selectedMember.customer_name}`}
            maxWidth="sm"
          >
            <form onSubmit={handleSavePoints} className="space-y-4">
              {pointsError && (
                <div role="alert" className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
                  {pointsError}
                </div>
              )}

              <div className="p-3 bg-surface-secondary border border-border rounded-xl text-xs space-y-1">
                <p><strong>Cliente:</strong> {selectedMember.customer_name} ({selectedMember.customer_phone})</p>
                <p><strong>Puntos Actuales:</strong> <span className="font-mono font-bold text-primary">{selectedMember.points_balance} pts</span></p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="points-action" className="block text-xs font-bold text-text-secondary">
                  Acción a Realizar *
                </label>
                <select
                  id="points-action"
                  value={pointsAction}
                  onChange={(e) => setPointsAction(e.target.value as "ADD" | "REDEEM")}
                  className="w-full px-3 py-2 bg-surface-input border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="ADD">Sumar Puntos (Premio / Compra)</option>
                  <option value="REDEEM">Canjear Puntos (Descuento)</option>
                </select>
              </div>

              <Input
                id="points-delta"
                label="Cantidad de Puntos *"
                type="number"
                placeholder="Ej. 50"
                value={pointsDelta}
                onChange={(e) => setPointsDelta(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsPointsModalOpen(false);
                    setSelectedMember(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {pointsAction === "ADD" ? "Sumar Puntos" : "Canjear Puntos"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Coupon Modal */}
        {couponToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setCouponToDelete(null)}
            title="Confirmar Eliminación de Cupón"
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-semantic-danger-text p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <p className="text-xs font-medium">
                  ¿Estás seguro de que deseas eliminar el cupón <strong>{couponToDelete.code}</strong>?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setCouponToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDeleteCoupon}>
                  Eliminar Cupón
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}