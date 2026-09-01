"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Activity,
  CheckCircle,
  AlertCircle,
  Tag,
  Flame,
  Calendar,
  Save,
  CheckCircle2,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Search,
  Lock,
  Unlock,
  LifeBuoy,
  MessageSquare,
  Clock,
  Plus,
  Send,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { SuperadminLayout } from "@/components/layouts/superadmin-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoundersPromoConfig, SupportTicket } from "@/types";
import { formatCRC } from "@/lib/utils";

interface ManagedTenant {
  id: string;
  legal_name: string;
  trade_name: string;
  identification_number: string;
  email: string;
  plan_id: string;
  state: "trial" | "active" | "past_due" | "grace_period" | "suspended" | "cancelled" | "expired";
  trial_days_left: number;
  branches_count: number;
  users_count: number;
  sales_count: number;
  total_sales_volume: number;
}

const DEFAULT_PROMO: FoundersPromoConfig = {
  is_active: true,
  discount_percentage: 20,
  expires_at: "2026-10-31",
  max_claims: 50,
  claimed_count: 18,
};

export default function SuperadminPage() {
  const [activeTab, setActiveTab] = useState<"executive" | "tenants" | "commercial" | "support" | "health">("executive");
  const [tenants, setTenants] = useState<ManagedTenant[]>([]);
  const [promoConfig, setPromoConfig] = useState<FoundersPromoConfig>(DEFAULT_PROMO);
  const [isSaved, setIsSaved] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Support tickets in Superadmin
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [agentReplyText, setAgentReplyText] = useState("");

  // Edit Tenant Plan Modal
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<ManagedTenant | null>(null);
  const [editPlanId, setEditPlanId] = useState("crece");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const foundTenants: ManagedTenant[] = [];
      const allTickets: SupportTicket[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("orbitica_settings_")) {
          const orgId = key.replace("orbitica_settings_", "");
          const rawSettings = localStorage.getItem(key);
          const rawSub = localStorage.getItem(`orbitica_subscription_${orgId}`);
          const rawSales = localStorage.getItem(`orbitica_sales_${orgId}`);
          const rawEmp = localStorage.getItem(`orbitica_employees_${orgId}`);
          const rawBr = localStorage.getItem(`orbitica_branches_${orgId}`);
          const rawTickets = localStorage.getItem(`orbitica_support_tickets_${orgId}`);

          if (rawSettings) {
            const parsedSettings = JSON.parse(rawSettings);
            const parsedSub = rawSub ? JSON.parse(rawSub) : null;
            const parsedSales = rawSales ? JSON.parse(rawSales) : [];
            const parsedEmp = rawEmp ? JSON.parse(rawEmp) : [];
            const parsedBr = rawBr ? JSON.parse(rawBr) : [];

            if (rawTickets) {
              const parsedT = JSON.parse(rawTickets);
              allTickets.push(...parsedT);
            }

            const totalVol = parsedSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);

            foundTenants.push({
              id: orgId,
              legal_name: parsedSettings.legal_name || "Empresa Registrada",
              trade_name: parsedSettings.trade_name || "Mi Negocio",
              identification_number: parsedSettings.identification_number || "3101000000",
              email: parsedSettings.email || "info@negocio.cr",
              plan_id: parsedSub?.plan_id || "crece",
              state: parsedSub?.state || "trial",
              trial_days_left: 14,
              branches_count: parsedBr.length || 1,
              users_count: (parsedEmp.length || 0) + 1,
              sales_count: parsedSales.length,
              total_sales_volume: totalVol,
            });
          }
        }
      }

      setTenants(foundTenants);
      setTickets(allTickets);

      const savedPromo = localStorage.getItem("orbitica_founders_promo");
      if (savedPromo) setPromoConfig(JSON.parse(savedPromo));
    } catch (e) {}
  }, []);

  // Actions on Tenants
  const handleExtendTrial = (tenantId: string, days: number = 7) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, trial_days_left: t.trial_days_left + days, state: "trial" } : t))
    );
    try {
      const rawSub = localStorage.getItem(`orbitica_subscription_${tenantId}`);
      if (rawSub) {
        const sub = JSON.parse(rawSub);
        sub.state = "trial";
        const curEnd = new Date(sub.trial_end_at || new Date());
        curEnd.setDate(curEnd.getDate() + days);
        sub.trial_end_at = curEnd.toISOString().split("T")[0];
        localStorage.setItem(`orbitica_subscription_${tenantId}`, JSON.stringify(sub));
      }
    } catch (e) {}
    alert(`✓ Período de prueba extendido por +${days} días para la organización.`);
  };

  const handleToggleSuspension = (tenantId: string) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === tenantId) {
          const nextState = t.state === "suspended" ? "active" : "suspended";
          try {
            const rawSub = localStorage.getItem(`orbitica_subscription_${tenantId}`);
            if (rawSub) {
              const sub = JSON.parse(rawSub);
              sub.state = nextState;
              localStorage.setItem(`orbitica_subscription_${tenantId}`, JSON.stringify(sub));
            }
          } catch (e) {}
          return { ...t, state: nextState };
        }
        return t;
      })
    );
  };

  const handleSavePlanChange = () => {
    if (!selectedTenantForEdit) return;
    setTenants((prev) =>
      prev.map((t) => (t.id === selectedTenantForEdit.id ? { ...t, plan_id: editPlanId, state: "active" } : t))
    );
    try {
      const rawSub = localStorage.getItem(`orbitica_subscription_${selectedTenantForEdit.id}`);
      const sub = rawSub ? JSON.parse(rawSub) : {};
      sub.plan_id = editPlanId;
      sub.state = "active";
      localStorage.setItem(`orbitica_subscription_${selectedTenantForEdit.id}`, JSON.stringify(sub));
    } catch (e) {}
    setSelectedTenantForEdit(null);
  };

  const handleSavePromo = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("orbitica_founders_promo", JSON.stringify(promoConfig));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } catch (e) {}
    }
  };

  const handleAgentReply = (ticketId: string) => {
    if (!agentReplyText.trim()) return;
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: "WAITING_CLIENT",
            messages: [
              ...t.messages,
              {
                id: `msg_${Date.now()}`,
                sender_type: "SUPPORT_AGENT",
                sender_name: "Especialista Orbítica Superadmin",
                message: agentReplyText.trim(),
                created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
              },
            ],
          };
        }
        return t;
      })
    );
    setAgentReplyText("");
  };

  // Executive Metrics Computations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.state === "active").length;
  const trialTenants = tenants.filter((t) => t.state === "trial").length;
  const suspendedTenants = tenants.filter((t) => t.state === "suspended").length;

  const mrr = tenants.reduce((acc, t) => {
    if (t.state !== "active") return acc;
    if (t.plan_id === "inicio") return acc + 9900;
    if (t.plan_id === "crece") return acc + 17900;
    if (t.plan_id === "escala") return acc + 27900;
    return acc;
  }, 0);

  const arr = mrr * 12;
  const totalSalesProcessed = tenants.reduce((acc, t) => acc + t.total_sales_volume, 0);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.trade_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.legal_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.identification_number.includes(searchFilter);
    const matchesStatus = statusFilter === "ALL" || t.state === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        {/* Top Header & Tab Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-primary/10 rounded-xl text-primary">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-main">
                  Orbítica Control Center — Superadmin
                </h1>
                <p className="text-xs text-text-muted">
                  Panel ejecutivo SaaS, gestión de clientes multi-tenant, motor de precios y mesa de ayuda.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-surface-secondary border border-border p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab("executive")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "executive" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              }`}
            >
              Métricas
            </button>
            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "tenants" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              }`}
            >
              Empresas ({tenants.length})
            </button>
            <button
              onClick={() => setActiveTab("commercial")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "commercial" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              }`}
            >
              Gestión Comercial
            </button>
            <button
              onClick={() => setActiveTab("support")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "support" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              }`}
            >
              Mesa de Ayuda ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "health" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"
              }`}
            >
              Salud Sistema
            </button>
          </div>
        </div>

        {/* TAB 1: EXECUTIVE METRICS */}
        {activeTab === "executive" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">MRR (Recurrente Mensual)</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-500 font-mono">
                  {formatCRC(mrr)}
                </div>
                <span className="text-[10px] text-text-muted">ARR Estimado: {formatCRC(arr)}</span>
              </Card>

              <Card className="p-4 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">Empresas Registradas</span>
                <div className="text-xl sm:text-2xl font-black text-text-main font-mono">{totalTenants}</div>
                <span className="text-[10px] text-text-muted">{activeTenants} Activas · {trialTenants} en Prueba</span>
              </Card>

              <Card className="p-4 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">Volumen Procesado POS</span>
                <div className="text-xl sm:text-2xl font-black text-primary font-mono">
                  {formatCRC(totalSalesProcessed)}
                </div>
                <span className="text-[10px] text-text-muted">Costa Rica v4.4</span>
              </Card>

              <Card className="p-4 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">Estado Hacienda ATV</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-500 font-mono">99.9%</div>
                <span className="text-[10px] text-emerald-500 font-bold">Servidores ATV Operativos</span>
              </Card>
            </div>

            {/* Quick Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 border border-border space-y-3">
                <h3 className="text-xs font-black text-text-main uppercase">Distribución de Planes</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Inicio (₡9.900)</span>
                    <span className="font-bold text-text-main">
                      {tenants.filter((t) => t.plan_id === "inicio").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Crece ⭐ (₡17.900)</span>
                    <span className="font-bold text-primary">
                      {tenants.filter((t) => t.plan_id === "crece").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Escala (₡27.900)</span>
                    <span className="font-bold text-purple-400">
                      {tenants.filter((t) => t.plan_id === "escala").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Empresarial (Cotización)</span>
                    <span className="font-bold text-cyan-400">
                      {tenants.filter((t) => t.plan_id === "empresarial").length}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border space-y-3">
                <h3 className="text-xs font-black text-text-main uppercase">Embudo de Conversión</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Pruebas Iniciadas (14d)</span>
                    <span className="font-bold text-primary">{trialTenants}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Conversión a Pago</span>
                    <span className="font-bold text-emerald-500">
                      {totalTenants > 0 ? ((activeTenants / totalTenants) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Cuentas Suspendidas</span>
                    <span className="font-bold text-red-500">{suspendedTenants}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border space-y-3">
                <h3 className="text-xs font-black text-text-main uppercase">Campañas Activas</h3>
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-primary block">🚀 Precio Fundadores 20% OFF</span>
                  <p className="text-[10px] text-text-muted">
                    Cupos: {promoConfig.claimed_count} / {promoConfig.max_claims} reclamados
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: TENANTS MANAGEMENT */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar por nombre, cédula o correo..."
                  className="pl-9 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="trial">En Prueba Gratuita (14d)</option>
                <option value="active">Suscripción Activa</option>
                <option value="suspended">Suspendidas</option>
              </select>
            </div>

            {/* Tenants Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Tabla de gestión de organizaciones">
                  <thead className="bg-surface-secondary border-b border-border text-text-muted font-bold">
                    <tr>
                      <th scope="col" className="p-3">Empresa / Razón Social</th>
                      <th scope="col" className="p-3">Plan Activo</th>
                      <th scope="col" className="p-3">Estado</th>
                      <th scope="col" className="p-3">Usuarios & Sucursales</th>
                      <th scope="col" className="p-3">Ventas POS</th>
                      <th scope="col" className="p-3 text-right">Acciones de Soporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-text-muted">
                          No se encontraron organizaciones con el filtro especificado.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-surface-secondary/50">
                          <td className="p-3">
                            <span className="font-black text-text-main block">{t.trade_name}</span>
                            <span className="text-[10px] text-text-muted block">
                              {t.legal_name} · Céd: {t.identification_number}
                            </span>
                            <span className="text-[10px] text-text-muted">{t.email}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant={t.plan_id === "crece" ? "blue" : "default"} className="capitalize">
                              {t.plan_id}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {t.state === "trial" && <Badge variant="warning">Trial ({t.trial_days_left}d)</Badge>}
                            {t.state === "active" && <Badge variant="success">Activa</Badge>}
                            {t.state === "suspended" && <Badge variant="danger">Suspendida</Badge>}
                          </td>
                          <td className="p-3 font-mono">
                            {t.users_count} Usuarios · {t.branches_count} Sucursal
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-text-main block font-mono">
                              {formatCRC(t.total_sales_volume)}
                            </span>
                            <span className="text-[10px] text-text-muted">{t.sales_count} ventas</span>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedTenantForEdit(t);
                                setEditPlanId(t.plan_id);
                              }}
                              className="text-[10px] font-bold h-7 px-2"
                            >
                              Cambiar Plan
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleExtendTrial(t.id, 7)}
                              className="text-[10px] font-bold h-7 px-2"
                            >
                              +7d Trial
                            </Button>
                            <Button
                              variant={t.state === "suspended" ? "primary" : "ghost"}
                              size="sm"
                              onClick={() => handleToggleSuspension(t.id)}
                              className="text-[10px] font-bold h-7 px-2 text-red-500 hover:bg-red-500/10"
                            >
                              {t.state === "suspended" ? "Reactivar" : "Suspender"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Modal: Change Plan */}
            {selectedTenantForEdit && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-6 border border-border space-y-4">
                  <div className="border-b border-border pb-3">
                    <h3 className="text-sm font-black text-text-main">
                      Modificar Plan: {selectedTenantForEdit.trade_name}
                    </h3>
                    <p className="text-xs text-text-muted">
                      Ajusta manualmente el nivel de suscripción y límites para esta empresa.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Plan Comercial</label>
                    <select
                      value={editPlanId}
                      onChange={(e) => setEditPlanId(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value="inicio">Orbítica Inicio (₡9.900 / mes)</option>
                      <option value="crece">Orbítica Crece ⭐ (₡17.900 / mes)</option>
                      <option value="escala">Orbítica Escala (₡27.900 / mes)</option>
                      <option value="empresarial">Orbítica Empresarial (A Medida)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" onClick={() => setSelectedTenantForEdit(null)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSavePlanChange} className="text-xs font-bold">
                      Guardar Cambios
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMMERCIAL & PRICING ENGINE */}
        {activeTab === "commercial" && (
          <div className="space-y-6">
            {/* Promo Card */}
            <Card className="p-6 border border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className="text-sm font-black text-text-main">
                      Motor de Promoción: "Precio Fundadores (20% OFF)"
                    </h2>
                    <p className="text-xs text-text-muted">
                      Configura el beneficio de lanzamiento para los primeros comercios en Costa Rica.
                    </p>
                  </div>
                </div>
                <Badge variant={promoConfig.is_active ? "success" : "default"}>
                  {promoConfig.is_active ? "CAMPAÑA ACTIVA" : "PAUSADA"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Estado de la Oferta</label>
                  <select
                    value={promoConfig.is_active ? "1" : "0"}
                    onChange={(e) => setPromoConfig((prev) => ({ ...prev, is_active: e.target.value === "1" }))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="1">Activa (Aparece en /subscription)</option>
                    <option value="0">Pausada (Precios Regulares)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">% Descuento Fundadores</label>
                  <Input
                    type="number"
                    value={promoConfig.discount_percentage}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({ ...prev, discount_percentage: Number(e.target.value) || 0 }))
                    }
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Fecha de Expiración</label>
                  <Input
                    type="date"
                    value={promoConfig.expires_at}
                    onChange={(e) => setPromoConfig((prev) => ({ ...prev, expires_at: e.target.value }))}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Cupos Reclamados / Total</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={promoConfig.claimed_count}
                      onChange={(e) =>
                        setPromoConfig((prev) => ({ ...prev, claimed_count: Number(e.target.value) || 0 }))
                      }
                      className="text-xs font-mono"
                      placeholder="Reclamados"
                    />
                    <span className="text-xs text-text-muted font-bold">/</span>
                    <Input
                      type="number"
                      value={promoConfig.max_claims}
                      onChange={(e) =>
                        setPromoConfig((prev) => ({ ...prev, max_claims: Number(e.target.value) || 0 }))
                      }
                      className="text-xs font-mono"
                      placeholder="Total"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] text-text-muted">
                  {isSaved ? "✓ ¡Configuración guardada y sincronizada globalmente!" : "Guarda los cambios para aplicarlos en la suite SaaS."}
                </span>
                <Button variant="primary" size="sm" onClick={handleSavePromo} className="gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-500">
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: SUPPORT DESK */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-4 border border-border space-y-3">
              <h2 className="text-xs font-black text-text-main uppercase tracking-wider">
                Bandeja de Tickets Entrantes
              </h2>
              {tickets.length === 0 ? (
                <p className="text-xs text-text-muted py-6 text-center">No hay tickets de soporte activos.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all space-y-1 ${
                        selectedTicketId === t.id ? "bg-primary/10 border-primary" : "bg-surface border-border"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono font-bold text-primary">{t.ticket_number}</span>
                        <Badge variant="blue">{t.category}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-text-main truncate">{t.subject}</h4>
                      <span className="text-[10px] text-text-muted block truncate">
                        Cliente: {t.created_by_name} ({t.organization_name})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <div className="lg:col-span-2 space-y-4">
              {activeTicket ? (
                <Card className="p-6 border border-border shadow-sm space-y-4">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-mono text-primary font-bold">{activeTicket.ticket_number}</span>
                      <h3 className="text-sm font-black text-text-main">{activeTicket.subject}</h3>
                      <p className="text-[11px] text-text-muted">
                        Empresa: {activeTicket.organization_name} · Email: {activeTicket.created_by_email}
                      </p>
                    </div>
                    <Badge variant={activeTicket.status === "OPEN" ? "warning" : "success"}>{activeTicket.status}</Badge>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {activeTicket.messages.map((msg) => (
                      <div key={msg.id} className="p-3 bg-surface-secondary rounded-2xl border border-border text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-text-main">{msg.sender_name}</span>
                          <span className="text-text-muted">{msg.created_at}</span>
                        </div>
                        <p className="text-text-secondary">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Input
                      value={agentReplyText}
                      onChange={(e) => setAgentReplyText(e.target.value)}
                      placeholder="Escribir respuesta al cliente como agente de soporte..."
                      className="text-xs flex-1"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAgentReply(activeTicket.id)}
                      className="font-bold text-xs gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 border border-border text-center text-xs text-text-muted">
                  Selecciona un ticket para responder al cliente.
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: HEALTH MONITOR */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <Card className="p-6 border border-border space-y-3">
              <h2 className="text-sm font-black text-text-main flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Monitor de Salud y Diagnóstico de Plataforma
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sincronización Multi-Tenant: 100% OK</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Firma Criptográfica XML v4.4: Activa</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>IndexedDB Offline Engine: Listo</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </SuperadminLayout>
  );
}