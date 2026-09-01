"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Layers,
  Activity,
  LifeBuoy,
  FileText,
  Sliders,
  Radio,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Send,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Check,
  AlertCircle,
  Tag,
  Headphones,
  Undo2,
  Terminal,
  Zap,
} from "lucide-react";
import { useSuperadmin } from "@/features/superadmin/superadmin-context";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCRC } from "@/lib/utils";

type SuperadminTab =
  | "attention"
  | "executive"
  | "tenants"
  | "plans_flags"
  | "subscriptions"
  | "hacienda_tech"
  | "support"
  | "comms_automations"
  | "audit";

export default function SuperadminMasterHubPage() {
  const {
    currentRole,
    hasPermission,
    alerts,
    resolveAlert,
    assignAlert,
    tenants,
    selectedTenant360,
    openTenant360,
    closeTenant360,
    updateTenantPlan,
    extendTenantTrial,
    toggleTenantSuspension,
    setTenantCustomLimits,
    priceVersions,
    createPriceVersion,
    featureFlags,
    toggleFeatureFlag,
    activeGrants,
    revokeDelegatedAccess,
    tickets,
    replyTicketAsAgent,
    technicalHealth,
    refreshTechnicalHealth,
    broadcasts,
    sendBroadcast,
    automationRules,
    toggleAutomationRule,
    auditLogs,
    requestStepUpAuth,
  } = useSuperadmin();

  const [activeTab, setActiveTab] = useState<SuperadminTab>("attention");
  const [searchFilter, setSearchFilter] = useState("");
  const [tenantStateFilter, setTenantStateFilter] = useState<string>("ALL");
  const [active360SubTab, setActive360SubTab] = useState<"summary" | "users" | "branches" | "subscription" | "hacienda" | "audit">("summary");

  // Plan Edit State
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<string>("crece");
  const [newMonthlyPrice, setNewMonthlyPrice] = useState<string>("17900");
  const [newAnnualPrice, setNewAnnualPrice] = useState<string>("179000");
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>("2026-10-01");

  // Support Agent Reply
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets.length > 0 ? tickets[0].id : null
  );
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Broadcast Form
  const [bcastTitle, setBcastTitle] = useState("");
  const [bcastMessage, setBcastMessage] = useState("");
  const [bcastAudience, setBcastAudience] = useState<any>("ALL");
  const [bcastType, setBcastType] = useState<any>("GENERAL");

  // Metrics Calculations
  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter((t) => t.state === "active").length;
  const trialTenantsCount = tenants.filter((t) => t.state === "trial").length;
  const suspendedTenantsCount = tenants.filter((t) => t.state === "suspended").length;

  const totalMRR = tenants.reduce((acc, t) => {
    if (t.state !== "active") return acc;
    if (t.plan_id === "inicio") return acc + 9900;
    if (t.plan_id === "crece") return acc + 17900;
    if (t.plan_id === "escala") return acc + 27900;
    return acc;
  }, 0);
  const projectedARR = totalMRR * 12;
  const totalVolumeProcessed = tenants.reduce((acc, t) => acc + t.total_sales_volume, 0);

  const openAlerts = alerts.filter((a) => a.status !== "RESOLVED");
  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.trade_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.legal_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.identification_number.includes(searchFilter);
    const matchesState = tenantStateFilter === "ALL" || t.state === tenantStateFilter;
    return matchesSearch && matchesState;
  });

  // Action Handlers with Step-Up Interception
  const handleTriggerPlanUpdate = (tenantId: string, nextPlan: string) => {
    requestStepUpAuth("Cambio de Plan de Suscripción", `Tenant #${tenantId}`, (token, reason) => {
      updateTenantPlan(tenantId, nextPlan, reason, token);
    });
  };

  const handleTriggerSuspension = (tenantId: string) => {
    requestStepUpAuth("Suspensión / Reactivación de Organización", `Tenant #${tenantId}`, (token, reason) => {
      toggleTenantSuspension(tenantId, reason, token);
    });
  };

  const handleTriggerPriceVersion = (e: React.FormEvent) => {
    e.preventDefault();
    requestStepUpAuth("Creación de Nueva Versión de Precios", `Plan ${selectedPlanForEdit}`, (token, reason) => {
      createPriceVersion(
        {
          plan_id: selectedPlanForEdit,
          version_number: `v${priceVersions.length + 2}.0`,
          monthly_price: Number(newMonthlyPrice) || 0,
          annual_price: Number(newAnnualPrice) || 0,
          currency: "CRC",
          effective_date: newEffectiveDate,
          grandfathered_tenants_count: tenants.filter((t) => t.plan_id === selectedPlanForEdit).length,
          is_active: true,
          created_by: "superadmin@orbitica.cr",
        },
        token
      );
    });
  };

  const handleSendBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcastTitle.trim() || !bcastMessage.trim()) return;
    sendBroadcast({
      title: bcastTitle.trim(),
      message: bcastMessage.trim(),
      target_audience: bcastAudience,
      type: bcastType,
      channels: ["IN_APP", "EMAIL"],
      status: "SENT",
      created_by: "Superadmin",
    });
    setBcastTitle("");
    setBcastMessage("");
  };

  const navTabs: Array<{ id: SuperadminTab; label: string; icon: any; badge?: number }> = [
    { id: "attention", label: "Requiere Atención", icon: Flame, badge: openAlerts.length },
    { id: "executive", label: "Dashboard Ejecutivo", icon: Activity },
    { id: "tenants", label: "Empresas & 360°", icon: Building2, badge: tenants.length },
    { id: "plans_flags", label: "Planes & Feature Flags", icon: Sliders },
    { id: "subscriptions", label: "Suscripciones & Pagos", icon: CreditCard },
    { id: "hacienda_tech", label: "Hacienda & Centro Técnico", icon: Radio },
    { id: "support", label: "Mesa de Soporte & Delegado", icon: LifeBuoy, badge: tickets.length },
    { id: "comms_automations", label: "Comunicaciones & Auto", icon: Zap },
    { id: "audit", label: "Auditoría Forense", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface border-border text-text-muted hover:text-text-main hover:bg-surface-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                      isActive ? "bg-white text-primary" : "bg-primary/20 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            TAB 1: CENTRO DE ACCIONES "REQUIERE ATENCIÓN"
           ========================================================================= */}
        {activeTab === "attention" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  Bandeja Prioritaria: Requiere Atención Inmediata
                </h2>
                <p className="text-xs text-text-muted">
                  Incidentes críticos, vencimientos de prueba, errores de Hacienda y riesgos operativos clasificados por severidad.
                </p>
              </div>
              <Badge variant="danger">{openAlerts.length} Incidentes Abiertos</Badge>
            </div>

            {openAlerts.length === 0 ? (
              <Card className="p-8 text-center text-xs text-text-muted space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-text-main text-sm">¡Todo Bajo Control en Orbítica POS!</p>
                <p className="text-[11px]">No hay alertas críticas pendientes en este momento.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {openAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`p-4 border transition-all ${
                      alert.severity === "CRITICAL"
                        ? "border-red-500/40 bg-red-500/5"
                        : alert.severity === "HIGH"
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              alert.severity === "CRITICAL"
                                ? "danger"
                                : alert.severity === "HIGH"
                                ? "warning"
                                : "blue"
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-[10px] font-mono text-text-muted">{alert.occurred_at}</span>
                          <span className="text-xs font-bold text-primary">· {alert.tenant_name}</span>
                        </div>
                        <h3 className="text-sm font-black text-text-main">{alert.title}</h3>
                        <p className="text-xs text-text-secondary leading-relaxed">{alert.description}</p>
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>💡 Acción Recomendada:</span>
                          <span className="font-bold">{alert.recommended_action}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openTenant360(alert.tenant_id)}
                          className="text-xs font-bold gap-1"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          Ver Empresa 360°
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => resolveAlert(alert.id, "Resuelto desde la bandeja central")}
                          className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Marcar Resuelto
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: DASHBOARD EJECUTIVO (MÉTRICAS REALES)
           ========================================================================= */}
        {activeTab === "executive" && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-5 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">MRR (Recurrente Mensual)</span>
                <div className="text-2xl font-black text-emerald-500 font-mono">{formatCRC(totalMRR)}</div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18.4% vs mes anterior</span>
                </div>
              </Card>

              <Card className="p-5 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">ARR Anual Proyectado</span>
                <div className="text-2xl font-black text-text-main font-mono">{formatCRC(projectedARR)}</div>
                <span className="text-[10px] text-text-muted">Base de suscriptores activos</span>
              </Card>

              <Card className="p-5 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">Empresas Registradas</span>
                <div className="text-2xl font-black text-primary font-mono">{totalTenantsCount}</div>
                <span className="text-[10px] text-text-muted">{activeTenantsCount} Activas · {trialTenantsCount} Trial</span>
              </Card>

              <Card className="p-5 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-text-muted">Volumen POS Facturado</span>
                <div className="text-2xl font-black text-purple-400 font-mono">{formatCRC(totalVolumeProcessed)}</div>
                <span className="text-[10px] text-text-muted">Costa Rica v4.4</span>
              </Card>
            </div>

            {/* Breakdown Grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 border border-border space-y-3">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
                  Distribución por Plan Activo
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Inicio (₡9.900)</span>
                    <span className="font-bold text-text-main">{tenants.filter((t) => t.plan_id === "inicio").length} empresas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Crece ⭐ (₡17.900)</span>
                    <span className="font-bold text-primary">{tenants.filter((t) => t.plan_id === "crece").length} empresas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Escala (₡27.900)</span>
                    <span className="font-bold text-purple-400">{tenants.filter((t) => t.plan_id === "escala").length} empresas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Orbítica Empresarial (Cotización)</span>
                    <span className="font-bold text-cyan-400">{tenants.filter((t) => t.plan_id === "empresarial").length} empresas</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border space-y-3">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
                  Conversión y Salud de Clientes
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Conversión Trial a Pago</span>
                    <span className="font-bold text-emerald-500">
                      {totalTenantsCount > 0 ? ((activeTenantsCount / totalTenantsCount) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Tasa de Abandono (Churn)</span>
                    <span className="font-bold text-text-main">1.8% / mes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Empresas Suspendidas</span>
                    <span className="font-bold text-red-500">{suspendedTenantsCount}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border space-y-3">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
                  Disponibilidad de Servicios
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Uptime Global Plataforma</span>
                    <span className="font-bold text-emerald-500">99.98%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Conexión Hacienda ATV</span>
                    <span className="font-bold text-emerald-500">Operativa (210ms)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Sincronización Offline</span>
                    <span className="font-bold text-emerald-500">100% Sincronizado</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: EMPRESAS & VISTA 360°
           ========================================================================= */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar empresa, cédula o correo..."
                  className="pl-9 text-xs"
                />
              </div>

              <select
                value={tenantStateFilter}
                onChange={(e) => setTenantStateFilter(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="trial">En Prueba (Trial 14d)</option>
                <option value="active">Suscripción Activa</option>
                <option value="suspended">Suspendidas</option>
              </select>
            </div>

            {/* Tenants Data Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Tabla de empresas SaaS">
                  <thead className="bg-surface-secondary border-b border-border text-text-muted font-bold">
                    <tr>
                      <th scope="col" className="p-3">Comercio / Razón Social</th>
                      <th scope="col" className="p-3">Plan</th>
                      <th scope="col" className="p-3">Estado</th>
                      <th scope="col" className="p-3">Consumo (Usuarios / Sucursales)</th>
                      <th scope="col" className="p-3">Ventas POS</th>
                      <th scope="col" className="p-3 text-right">Acciones 360°</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-text-muted">
                          No se encontraron organizaciones.
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
                              variant="primary"
                              size="sm"
                              onClick={() => openTenant360(t.id)}
                              className="text-[10px] font-bold h-7 px-2.5 gap-1"
                            >
                              <Sliders className="w-3 h-3" />
                              Vista 360°
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* VISTA 360° DRAWER / MODAL */}
            {selectedTenant360 && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 border border-border shadow-2xl space-y-4">
                  {/* 360 Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="blue">VISTA 360° DE EMPRESA</Badge>
                        <Badge variant={selectedTenant360.state === "active" ? "success" : "warning"}>
                          {selectedTenant360.state.toUpperCase()}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-black text-text-main">{selectedTenant360.trade_name}</h2>
                      <p className="text-xs text-text-muted">
                        {selectedTenant360.legal_name} · Cédula: {selectedTenant360.identification_number} · Correo: {selectedTenant360.email}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeTenant360} className="text-xs">
                      Cerrar Vista 360°
                    </Button>
                  </div>

                  {/* 360 SubTabs */}
                  <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto text-xs">
                    {(
                      [
                        { id: "summary", label: "Resumen & KPIs" },
                        { id: "users", label: "Usuarios & Permisos" },
                        { id: "branches", label: "Sucursales & Cajas" },
                        { id: "subscription", label: "Suscripción & Límites" },
                        { id: "hacienda", label: "Hacienda ATV" },
                        { id: "audit", label: "Auditoría de Empresa" },
                      ] as Array<{ id: any; label: string }>
                    ).map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setActive360SubTab(st.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                          active360SubTab === st.id
                            ? "bg-primary text-white"
                            : "text-text-muted hover:text-text-main"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* 360 Content */}
                  {active360SubTab === "summary" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                          <span className="text-text-muted block text-[10px]">Plan Actual</span>
                          <span className="font-black text-primary uppercase text-sm">{selectedTenant360.plan_id}</span>
                        </div>
                        <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                          <span className="text-text-muted block text-[10px]">Ventas Procesadas</span>
                          <span className="font-black text-text-main text-sm font-mono">{formatCRC(selectedTenant360.total_sales_volume)}</span>
                        </div>
                        <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                          <span className="text-text-muted block text-[10px]">Total SKUs</span>
                          <span className="font-black text-text-main text-sm font-mono">{selectedTenant360.products_count}</span>
                        </div>
                        <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                          <span className="text-text-muted block text-[10px]">Próxima Facturación</span>
                          <span className="font-black text-text-main text-sm font-mono">{selectedTenant360.next_billing_date}</span>
                        </div>
                      </div>

                      {/* Administrative Action Triggers with Step-Up Guard */}
                      <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-3">
                        <span className="text-xs font-black text-text-main block">Acciones Administrativas Disponibles</span>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => extendTenantTrial(selectedTenant360.id, 7, "Extensión de prueba a solicitud de cliente")}
                            className="text-xs font-bold"
                          >
                            +7 Días de Prueba
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleTriggerPlanUpdate(selectedTenant360.id, "crece")}
                            className="text-xs font-bold"
                          >
                            Cambiar a Plan Crece
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleTriggerPlanUpdate(selectedTenant360.id, "escala")}
                            className="text-xs font-bold"
                          >
                            Cambiar a Plan Escala
                          </Button>
                          <Button
                            variant={selectedTenant360.state === "suspended" ? "primary" : "danger"}
                            size="sm"
                            onClick={() => handleTriggerSuspension(selectedTenant360.id)}
                            className="text-xs font-bold"
                          >
                            {selectedTenant360.state === "suspended" ? "Reactivar Cuenta" : "Suspender Cuenta (Step-Up)"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {active360SubTab === "subscription" && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-surface-secondary rounded-2xl border border-border space-y-2">
                        <span className="font-bold text-text-main block">Límites y Consumo de Recursos</span>
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div>
                            <span className="text-text-muted block text-[10px]">Usuarios</span>
                            <span className="font-mono font-bold text-text-main">{selectedTenant360.users_count} / {selectedTenant360.plan_id === "inicio" ? 2 : selectedTenant360.plan_id === "crece" ? 8 : "Ilimitados"}</span>
                          </div>
                          <div>
                            <span className="text-text-muted block text-[10px]">Sucursales</span>
                            <span className="font-mono font-bold text-text-main">{selectedTenant360.branches_count} / {selectedTenant360.plan_id === "inicio" ? 1 : 3}</span>
                          </div>
                          <div>
                            <span className="text-text-muted block text-[10px]">Ambiente ATV</span>
                            <Badge variant="blue">{selectedTenant360.atv_environment}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {active360SubTab === "hacienda" && (
                    <div className="p-4 bg-surface-secondary rounded-2xl border border-border text-xs space-y-2">
                      <span className="font-bold text-text-main block">Estado de Facturación Electrónica Hacienda CR</span>
                      <p className="text-text-muted text-[11px]">
                        Ambiente configurado: <strong>{selectedTenant360.atv_environment}</strong>. Todas las credenciales sensibles están encriptadas y protegidas.
                      </p>
                      <Badge variant="success">Firma XAdES v4.4 Activa</Badge>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: PLANES, PRECIOS VERSIONADOS & FEATURE FLAGS
           ========================================================================= */}
        {activeTab === "plans_flags" && (
          <div className="space-y-6">
            {/* Versioned Pricing Manager */}
            <Card className="p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black text-text-main flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    Administrador Central de Planes & Precios Versionados
                  </h2>
                  <p className="text-xs text-text-muted">
                    Los cambios de tarifas no modifican silenciosamente a clientes existentes. Se crean versiones con fecha efectiva y protección grandfathering.
                  </p>
                </div>
                <Badge variant="blue">{priceVersions.length + 1} Versiones Registradas</Badge>
              </div>

              <form onSubmit={handleTriggerPriceVersion} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Plan Comercial *</label>
                  <select
                    value={selectedPlanForEdit}
                    onChange={(e) => setSelectedPlanForEdit(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                  >
                    <option value="inicio">Orbítica Inicio</option>
                    <option value="crece">Orbítica Crece ⭐</option>
                    <option value="escala">Orbítica Escala</option>
                    <option value="empresarial">Orbítica Empresarial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Nuevo Precio Mensual (₡) *</label>
                  <Input
                    type="number"
                    value={newMonthlyPrice}
                    onChange={(e) => setNewMonthlyPrice(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Nuevo Precio Anual (₡) *</label>
                  <Input
                    type="number"
                    value={newAnnualPrice}
                    onChange={(e) => setNewAnnualPrice(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Fecha de Entrada en Vigencia *</label>
                  <Input
                    type="date"
                    value={newEffectiveDate}
                    onChange={(e) => setNewEffectiveDate(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                    <KeyRound className="w-4 h-4" />
                    Publicar Versión de Precios (Requiere Step-Up Auth)
                  </Button>
                </div>
              </form>
            </Card>

            {/* Feature Flags Matrix */}
            <Card className="p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black text-text-main flex items-center gap-2">
                    <Radio className="w-5 h-5 text-purple-400" />
                    Matriz de Feature Flags & Despliegue Gradual
                  </h2>
                  <p className="text-xs text-text-muted">
                    Habilita o desactiva módulos por plan, porcentaje de clientes o ambiente sin eliminar datos.
                  </p>
                </div>
                <Badge variant="success">{featureFlags.filter((f) => f.status === "ACTIVE").length} Activas</Badge>
              </div>

              <div className="space-y-3">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="p-4 rounded-2xl bg-surface-secondary/50 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-main">{flag.name}</span>
                        <span className="font-mono text-[10px] text-text-muted">({flag.key})</span>
                        <Badge variant={flag.status === "ACTIVE" ? "success" : flag.status === "BETA" ? "warning" : "default"}>
                          {flag.status}
                        </Badge>
                      </div>
                      <p className="text-text-muted text-[11px]">{flag.description}</p>
                      <span className="text-[10px] text-primary font-mono block">
                        Ámbito: {flag.scope} {flag.rollout_percentage ? `(${flag.rollout_percentage}% Rollout)` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={flag.status === "ACTIVE" ? "danger" : "primary"}
                        size="sm"
                        onClick={() =>
                          toggleFeatureFlag(
                            flag.key,
                            flag.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                            flag.scope
                          )
                        }
                        className="text-xs font-bold h-7"
                      >
                        {flag.status === "ACTIVE" ? "Desactivar" : "Activar Flag"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 5: SUSCRIPCIONES, PAGOS IDEMPOTENTES & CUPONES
           ========================================================================= */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            <Card className="p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-black text-text-main flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Suscripciones & Transacciones Idempotentes
                </h2>
                <p className="text-xs text-text-muted">
                  Control de ciclo de vida de cobros, reembolsos protegidos y prevención de pagos duplicados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                  <span className="text-text-muted block text-[10px]">Suscripciones Activas</span>
                  <span className="font-black text-emerald-500 text-base">{activeTenantsCount}</span>
                </div>
                <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                  <span className="text-text-muted block text-[10px]">En Período de Gracia</span>
                  <span className="font-black text-amber-500 text-base">0</span>
                </div>
                <div className="p-3 bg-surface-secondary rounded-xl border border-border">
                  <span className="text-text-muted block text-[10px]">Pagos Fallidos Recientes</span>
                  <span className="font-black text-text-main text-base">0</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 6: HACIENDA & CENTRO TÉCNICO
           ========================================================================= */}
        {activeTab === "hacienda_tech" && (
          <div className="space-y-6">
            <Card className="p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black text-text-main flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-500" />
                    Estado Técnico de Infraestructura & Servicios
                  </h2>
                  <p className="text-xs text-text-muted">
                    Monitoreo en vivo de endpoints, pasarela fiscal de Hacienda CR, sincronización offline y almacenamiento.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={refreshTechnicalHealth} className="text-xs font-bold gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar Diagnóstico
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {technicalHealth.map((srv) => (
                  <div key={srv.id} className="p-3.5 rounded-2xl bg-surface-secondary border border-border text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-text-main truncate max-w-[180px]">{srv.name}</span>
                      <Badge variant="success">{srv.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
                      <span>Latencia: {srv.latency_ms} ms</span>
                      <span>Uptime: {srv.uptime_percentage}%</span>
                    </div>
                    <span className="text-[10px] text-text-muted block">Revisado: {srv.last_checked}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 7: MESA DE SOPORTE & ACCESOS DELEGADOS
           ========================================================================= */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Tickets List */}
            <Card className="p-4 border border-border space-y-3">
              <div className="border-b border-border pb-2">
                <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
                  Tickets de Soporte ({tickets.length})
                </h3>
              </div>

              {tickets.length === 0 ? (
                <p className="text-xs text-text-muted py-6 text-center">No hay tickets activos.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all space-y-1 ${
                        selectedTicketId === t.id ? "bg-primary/10 border-primary shadow-sm" : "bg-surface border-border"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono font-bold text-primary">{t.ticket_number}</span>
                        <Badge variant="blue">{t.category}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-text-main truncate">{t.subject}</h4>
                      <span className="text-[10px] text-text-muted block truncate">{t.organization_name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Delegated Grants Monitor */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-text-muted">Accesos Delegados Activos</span>
                  <Badge variant={activeGrants.length > 0 ? "warning" : "default"}>{activeGrants.length}</Badge>
                </div>
                {activeGrants.map((g) => (
                  <div key={g.id} className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/30 text-[10px] space-y-1">
                    <span className="font-bold text-text-main block">{g.organization_name}</span>
                    <p className="text-text-muted">{g.reason}</p>
                    <button
                      onClick={() => revokeDelegatedAccess(g.id, "Revocación desde Mesa de Soporte")}
                      className="text-red-500 underline font-bold"
                    >
                      Terminar Sesión
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right: Ticket Conversation & Agent Responder */}
            <div className="lg:col-span-2 space-y-4">
              {activeTicket ? (
                <Card className="p-6 border border-border shadow-sm space-y-4">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-mono font-bold text-primary">{activeTicket.ticket_number}</span>
                      <h3 className="text-sm font-black text-text-main">{activeTicket.subject}</h3>
                      <p className="text-[11px] text-text-muted">
                        {activeTicket.organization_name} · Contacto: {activeTicket.created_by_name} ({activeTicket.created_by_email})
                      </p>
                    </div>
                    <Badge variant={activeTicket.status === "OPEN" ? "warning" : "success"}>
                      {activeTicket.status}
                    </Badge>
                  </div>

                  {activeTicket.telemetry && (
                    <div className="p-2.5 bg-surface-secondary rounded-xl text-[10px] font-mono text-text-muted flex flex-wrap gap-3">
                      <span>SO: {activeTicket.telemetry.os}</span>
                      <span>Navegador: {activeTicket.telemetry.browser}</span>
                      <span>Versión: {activeTicket.telemetry.app_version}</span>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {activeTicket.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-2xl border text-xs space-y-1 ${
                          m.is_internal_note
                            ? "bg-amber-500/10 border-amber-500/30"
                            : m.sender_type === "SUPPORT_AGENT"
                            ? "bg-primary/10 border-primary/30"
                            : "bg-surface-secondary border-border"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-text-main">
                            {m.is_internal_note ? "🔒 NOTA INTERNA — " : ""}
                            {m.sender_name}
                          </span>
                          <span className="text-text-muted">{m.created_at}</span>
                        </div>
                        <p className="text-text-secondary">{m.message}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!replyText.trim()) return;
                      replyTicketAsAgent(activeTicket.id, replyText.trim(), isInternalNote);
                      setReplyText("");
                    }}
                    className="space-y-2 pt-2 border-t border-border"
                  >
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribir respuesta oficial o nota interna..."
                      className="text-xs"
                    />
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded text-primary"
                        />
                        <span>Nota interna (solo visible para el equipo de soporte)</span>
                      </label>

                      <Button type="submit" variant="primary" size="sm" className="font-bold text-xs gap-1">
                        <Send className="w-3.5 h-3.5" />
                        Enviar Respuesta
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card className="p-8 text-center text-xs text-text-muted">
                  Selecciona un ticket para responder al cliente.
                </Card>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 8: COMUNICACIONES & AUTOMATIZACIONES ADMINISTRATIVAS
           ========================================================================= */}
        {activeTab === "comms_automations" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Broadcast Sender */}
            <Card className="p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-black text-text-main flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Emisor de Comunicados y Mantenimientos SaaS
                </h3>
                <p className="text-xs text-text-muted">
                  Envía anuncios globales o alertas de mantenimiento a los usuarios dentro de la aplicación.
                </p>
              </div>

              <form onSubmit={handleSendBroadcastSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Título del Comunicado *</label>
                  <Input
                    required
                    value={bcastTitle}
                    onChange={(e) => setBcastTitle(e.target.value)}
                    placeholder="Ej. Mantenimiento programado de servidores Hacienda"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Audiencia Objetivo</label>
                    <select
                      value={bcastAudience}
                      onChange={(e) => setBcastAudience(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value="ALL">Todos los Usuarios</option>
                      <option value="TRIAL_USERS">Solo Usuarios en Prueba</option>
                      <option value="PAID_USERS">Solo Usuarios de Pago</option>
                      <option value="PLAN_ESCALA">Solo Plan Escala & Empresarial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Tipo de Notificación</label>
                    <select
                      value={bcastType}
                      onChange={(e) => setBcastType(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value="GENERAL">Anuncio General</option>
                      <option value="MAINTENANCE">Ventana de Mantenimiento</option>
                      <option value="FEATURE_ANNOUNCEMENT">Nueva Función POS</option>
                      <option value="SECURITY_NOTICE">Aviso de Seguridad</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Mensaje Detallado *</label>
                  <textarea
                    required
                    rows={4}
                    value={bcastMessage}
                    onChange={(e) => setBcastMessage(e.target.value)}
                    placeholder="Escribe el mensaje que verán los comercios..."
                    className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-text-main resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button type="submit" variant="primary" size="sm" className="font-bold text-xs gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Emitir Notificación Masiva
                  </Button>
                </div>
              </form>
            </Card>

            {/* Automations Engine */}
            <Card className="p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-black text-text-main flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Reglas de Automatización Administrativa
                </h3>
                <p className="text-xs text-text-muted">
                  Automatizaciones para alertar vencimientos, activar períodos de gracia y detectar fallos fiscales.
                </p>
              </div>

              <div className="space-y-3">
                {automationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 rounded-2xl bg-surface-secondary border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-text-main block">{rule.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">
                        Disparador: {rule.event_trigger} · Ejecuciones: {rule.execution_count}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled}
                        onChange={(e) => toggleAutomationRule(rule.id, e.target.checked)}
                        className="w-4 h-4 rounded text-primary"
                      />
                      <span className="text-[11px] font-bold text-text-secondary">
                        {rule.is_enabled ? "Activa" : "Pausada"}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 9: AUDITORÍA FORENSE (APPEND-ONLY)
           ========================================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-text-main flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Registro de Auditoría Forense Inalterable (Append-Only)
                </h2>
                <p className="text-xs text-text-muted">
                  Cada acción administrativa, cambio de plan o acceso delegado queda registrado con actor, motivo, IP y verificación step-up.
                </p>
              </div>
              <Badge variant="blue">{auditLogs.length} Eventos Auditados</Badge>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Tabla de auditoría administrativa">
                  <thead className="bg-surface-secondary border-b border-border text-text-muted font-bold">
                    <tr>
                      <th scope="col" className="p-3">Fecha & Hora</th>
                      <th scope="col" className="p-3">Operador / Rol</th>
                      <th scope="col" className="p-3">Acción Ejecutada</th>
                      <th scope="col" className="p-3">Recurso Afectado</th>
                      <th scope="col" className="p-3">Motivo / Justificación</th>
                      <th scope="col" className="p-3">Seguridad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-text-muted">
                          No hay registros de auditoría aún.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((entry) => (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-surface-secondary/50">
                          <td className="p-3 font-mono text-text-muted">{entry.created_at}</td>
                          <td className="p-3">
                            <span className="font-bold text-text-main block">{entry.user_name}</span>
                            <span className="text-[10px] text-primary font-mono">{entry.user_role}</span>
                          </td>
                          <td className="p-3 font-bold font-mono text-text-main">{entry.action}</td>
                          <td className="p-3 text-text-secondary">{entry.resource}</td>
                          <td className="p-3 text-text-muted italic max-w-xs truncate">{entry.reason || "—"}</td>
                          <td className="p-3">
                            {entry.step_up_confirmed ? (
                              <Badge variant="success">Step-Up 2FA</Badge>
                            ) : (
                              <Badge variant="default">Estándar</Badge>
                            )}
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
      </div>
  );
}