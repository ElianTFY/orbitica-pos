"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  SuperadminRole,
  SuperadminPermission,
  PlatformAlert,
  PricePlanVersion,
  FeatureFlagDefinition,
  IdempotentPaymentTransaction,
  PlatformBroadcast,
  PlatformAutomationRule,
  SuperadminAuditEntry,
  TechnicalServiceHealth,
  SupportTicket,
  SupportAccessGrant,
} from "@/types";

export interface ManagedTenant360 {
  id: string;
  legal_name: string;
  trade_name: string;
  identification_number: string;
  identification_type: string;
  email: string;
  phone: string;
  plan_id: string;
  state: "trial" | "active" | "past_due" | "grace_period" | "suspended" | "cancelled" | "expired";
  trial_days_left: number;
  created_at: string;
  next_billing_date: string;
  branches_count: number;
  users_count: number;
  products_count: number;
  sales_count: number;
  total_sales_volume: number;
  hacienda_status: "OPERATIONAL" | "WARNING" | "CONFIG_REQUIRED";
  atv_environment: "STAGING" | "PRODUCTION";
  custom_limits?: {
    users?: number;
    branches?: number;
    terminals?: number;
  };
  assigned_manager?: string;
  tags: string[];
}

interface SuperadminContextType {
  currentRole: SuperadminRole;
  setCurrentRole: (role: SuperadminRole) => void;
  hasPermission: (perm: SuperadminPermission) => boolean;

  // Alerts
  alerts: PlatformAlert[];
  resolveAlert: (alertId: string, notes?: string) => void;
  assignAlert: (alertId: string, assignee: string) => void;

  // Tenants
  tenants: ManagedTenant360[];
  selectedTenant360: ManagedTenant360 | null;
  openTenant360: (tenantId: string) => void;
  closeTenant360: () => void;
  updateTenantPlan: (tenantId: string, planId: string, reason: string, stepUpToken?: string) => void;
  extendTenantTrial: (tenantId: string, days: number, reason: string) => void;
  toggleTenantSuspension: (tenantId: string, reason: string, stepUpToken?: string) => void;
  setTenantCustomLimits: (tenantId: string, limits: { users?: number; branches?: number }) => void;

  // Price Versions
  priceVersions: PricePlanVersion[];
  createPriceVersion: (version: Omit<PricePlanVersion, "id" | "created_at">, stepUpToken: string) => void;

  // Feature Flags
  featureFlags: FeatureFlagDefinition[];
  toggleFeatureFlag: (flagKey: string, status: FeatureFlagDefinition["status"], scope: FeatureFlagDefinition["scope"], rolloutPct?: number, stepUpToken?: string) => void;

  // Idempotent Transactions & Refunds
  transactions: IdempotentPaymentTransaction[];
  executeRefund: (transactionId: string, amount: number, reason: string, stepUpToken: string) => boolean;

  // Delegated Access Monitor
  activeGrants: SupportAccessGrant[];
  revokeDelegatedAccess: (grantId: string, reason: string) => void;

  // Support Tickets
  tickets: SupportTicket[];
  replyTicketAsAgent: (ticketId: string, message: string, isInternalNote?: boolean) => void;
  assignTicket: (ticketId: string, agentName: string) => void;

  // Technical Health
  technicalHealth: TechnicalServiceHealth[];
  refreshTechnicalHealth: () => void;

  // Broadcast & Automations
  broadcasts: PlatformBroadcast[];
  sendBroadcast: (broadcast: Omit<PlatformBroadcast, "id" | "sent_at" | "created_at">) => void;
  automationRules: PlatformAutomationRule[];
  toggleAutomationRule: (ruleId: string, isEnabled: boolean) => void;

  // Audit Log
  auditLogs: SuperadminAuditEntry[];
  logAuditEvent: (event: Omit<SuperadminAuditEntry, "id" | "created_at" | "session_id" | "ip_address" | "user_agent">) => void;

  // Step-Up Authentication Modal State
  stepUpModalOpen: boolean;
  stepUpActionContext: { action: string; resource: string; onConfirm: (token: string, reason: string) => void } | null;
  requestStepUpAuth: (action: string, resource: string, onConfirm: (token: string, reason: string) => void) => void;
  closeStepUpModal: () => void;

  // Universal Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const SuperadminContext = createContext<SuperadminContextType | undefined>(undefined);

// Initial Mock Technical Health Services
const DEFAULT_TECH_HEALTH: TechnicalServiceHealth[] = [
  { id: "srv_frontend", name: "Next.js Frontend Edge (Vercel)", category: "FRONTEND", status: "OPERATIONAL", latency_ms: 18, uptime_percentage: 99.99, last_checked: "Hace 1 min" },
  { id: "srv_api", name: "Core REST API & Microservices", category: "API", status: "OPERATIONAL", latency_ms: 26, uptime_percentage: 99.98, last_checked: "Hace 1 min" },
  { id: "srv_atv", name: "Ministerio de Hacienda CR (ATV v4.4)", category: "HACIENDA_ATV", status: "OPERATIONAL", latency_ms: 210, uptime_percentage: 99.85, last_checked: "Hace 30 seg" },
  { id: "srv_offline", name: "IndexedDB Offline Sync Engine", category: "OFFLINE_SYNC", status: "OPERATIONAL", latency_ms: 12, uptime_percentage: 100, last_checked: "Hace 2 min" },
  { id: "srv_storage", name: "Cloudflare R2 Object Storage", category: "R2_STORAGE", status: "OPERATIONAL", latency_ms: 45, uptime_percentage: 99.99, last_checked: "Hace 5 min" },
  { id: "srv_email", name: "Resend / SMTP Transactional Workers", category: "EMAIL_WORKERS", status: "OPERATIONAL", latency_ms: 60, uptime_percentage: 99.95, last_checked: "Hace 1 min" },
  { id: "srv_pay", name: "SINPE Móvil & Card Gateway", category: "PAYMENTS", status: "OPERATIONAL", latency_ms: 95, uptime_percentage: 99.92, last_checked: "Hace 1 min" },
];

// Initial Feature Flags
const DEFAULT_FEATURE_FLAGS: FeatureFlagDefinition[] = [
  { id: "flag_offline_pos", key: "offline_pos_engine", name: "Modo Offline POS Avanzado", description: "Permite cobros continuos sin conexión a internet y sincronización diferida", status: "ACTIVE", scope: "BY_PLAN", target_plans: ["crece", "escala", "empresarial"], environment: "ALL", created_at: "2026-08-01", updated_at: "2026-08-30" },
  { id: "flag_xades_v44", key: "xades_epes_v44", name: "Firma Criptográfica XAdES-EPES v4.4", description: "Firmado XML conforme a normativa tributaria de Costa Rica", status: "ACTIVE", scope: "GLOBAL", environment: "ALL", created_at: "2026-08-01", updated_at: "2026-08-30" },
  { id: "flag_ai_forecast", key: "ai_inventory_forecast", name: "Predicción de Demanda e Inventario con IA", description: "Recomendaciones automáticas de reabastecimiento por Machine Learning", status: "BETA", scope: "PERCENTAGE", rollout_percentage: 25, environment: "PRODUCTION", created_at: "2026-08-20", updated_at: "2026-08-31" },
  { id: "flag_dispatch_routing", key: "dispatch_smart_routing", name: "Optimización Inteligente de Rutas de Entrega", description: "Cálculo de rutas óptimas para choferes y despachos con GPS", status: "INTERNAL_TESTING", scope: "BY_PLAN", target_plans: ["escala", "empresarial"], environment: "STAGING", created_at: "2026-08-25", updated_at: "2026-08-31" },
];

// Initial Automation Rules
const DEFAULT_AUTOMATION_RULES: PlatformAutomationRule[] = [
  { id: "rule_1", name: "Alerta de Vencimiento de Prueba (48h antes)", event_trigger: "TRIAL_EXPIRING_48H", action: "SEND_EMAIL_REMINDER", is_enabled: true, execution_count: 34, last_executed_at: "2026-08-31 18:20" },
  { id: "rule_2", name: "Activación Automática de Período de Gracia (7 días)", event_trigger: "PAYMENT_FAILED", action: "TRIGGER_GRACE_PERIOD", is_enabled: true, execution_count: 12, last_executed_at: "2026-08-30 09:15" },
  { id: "rule_3", name: "Escalamiento Urgente por Documentos Rechazados Hacienda", event_trigger: "INVOICE_REJECTED_HACIENDA", action: "CREATE_CRITICAL_ALERT", is_enabled: true, execution_count: 8, last_executed_at: "2026-08-31 14:00" },
  { id: "rule_4", name: "Alerta de Caja Abierta > 18 Horas Sin Arqueo Z", event_trigger: "STALE_CASH_REGISTER_18H", action: "CREATE_CRITICAL_ALERT", is_enabled: true, execution_count: 5, last_executed_at: "2026-08-31 20:10" },
];

export function SuperadminProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<SuperadminRole>("PLATFORM_OWNER");
  const [tenants, setTenants] = useState<ManagedTenant360[]>([]);
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [priceVersions, setPriceVersions] = useState<PricePlanVersion[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagDefinition[]>(DEFAULT_FEATURE_FLAGS);
  const [transactions, setTransactions] = useState<IdempotentPaymentTransaction[]>([]);
  const [activeGrants, setActiveGrants] = useState<SupportAccessGrant[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [technicalHealth, setTechnicalHealth] = useState<TechnicalServiceHealth[]>(DEFAULT_TECH_HEALTH);
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcast[]>([]);
  const [automationRules, setAutomationRules] = useState<PlatformAutomationRule[]>(DEFAULT_AUTOMATION_RULES);
  const [auditLogs, setAuditLogs] = useState<SuperadminAuditEntry[]>([]);

  // Step-Up Modal
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [stepUpActionContext, setStepUpActionContext] = useState<{ action: string; resource: string; onConfirm: (token: string, reason: string) => void } | null>(null);

  // Universal Command Palette
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Load Real Data from Multi-Tenant LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const foundTenants: ManagedTenant360[] = [];
      const foundAlerts: PlatformAlert[] = [];
      const foundTickets: SupportTicket[] = [];
      const foundGrants: SupportAccessGrant[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("orbitica_settings_")) {
          const orgId = key.replace("orbitica_settings_", "");
          const rawSettings = localStorage.getItem(key);
          const rawSub = localStorage.getItem(`orbitica_subscription_${orgId}`);
          const rawSales = localStorage.getItem(`orbitica_sales_${orgId}`);
          const rawEmp = localStorage.getItem(`orbitica_employees_${orgId}`);
          const rawBr = localStorage.getItem(`orbitica_branches_${orgId}`);
          const rawProd = localStorage.getItem(`orbitica_products_${orgId}`);
          const rawTickets = localStorage.getItem(`orbitica_support_tickets_${orgId}`);
          const rawGrant = localStorage.getItem(`orbitica_active_support_grant_${orgId}`);

          if (rawSettings) {
            const parsedSettings = JSON.parse(rawSettings);
            const parsedSub = rawSub ? JSON.parse(rawSub) : null;
            const parsedSales = rawSales ? JSON.parse(rawSales) : [];
            const parsedEmp = rawEmp ? JSON.parse(rawEmp) : [];
            const parsedBr = rawBr ? JSON.parse(rawBr) : [];
            const parsedProd = rawProd ? JSON.parse(rawProd) : [];

            if (rawTickets) {
              const parsedT = JSON.parse(rawTickets);
              foundTickets.push(...parsedT);
            }
            if (rawGrant) {
              const g = JSON.parse(rawGrant);
              if (!g.is_revoked && new Date(g.expires_at).getTime() > Date.now()) {
                foundGrants.push(g);
              }
            }

            const totalVol = parsedSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);

            // Compute health & alerts for this tenant
            if (parsedSub?.state === "trial") {
              const trialEnd = new Date(parsedSub.trial_end_at || new Date()).getTime();
              const daysLeft = Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)));
              if (daysLeft <= 2) {
                foundAlerts.push({
                  id: `alert_trial_${orgId}`,
                  severity: "HIGH",
                  category: "TRIAL_EXPIRING",
                  tenant_id: orgId,
                  tenant_name: parsedSettings.trade_name || "Mi Negocio",
                  title: `Prueba Gratuita Próxima a Vencer (${daysLeft} días restantes)`,
                  description: `La empresa ${parsedSettings.trade_name} culmina su período de evaluación de 14 días pronto.`,
                  occurred_at: new Date().toISOString(),
                  recommended_action: "Ofrecer promoción de cierre o extender prueba +7 días",
                  deep_link: `/superadmin?tab=tenants&tenant=${orgId}`,
                  status: "OPEN",
                });
              }
            }

            foundTenants.push({
              id: orgId,
              legal_name: parsedSettings.legal_name || "Empresa Registrada",
              trade_name: parsedSettings.trade_name || "Mi Negocio",
              identification_number: parsedSettings.identification_number || "3101000000",
              identification_type: parsedSettings.identification_type || "JURIDICA",
              email: parsedSettings.email || "info@negocio.cr",
              phone: parsedSettings.phone || "+506 2200-0000",
              plan_id: parsedSub?.plan_id || "crece",
              state: parsedSub?.state || "trial",
              trial_days_left: 14,
              created_at: parsedSettings.created_at || "2026-08-30",
              next_billing_date: parsedSub?.current_period_end || "2026-09-14",
              branches_count: parsedBr.length || 1,
              users_count: (parsedEmp.length || 0) + 1,
              products_count: parsedProd.length || 0,
              sales_count: parsedSales.length,
              total_sales_volume: totalVol,
              hacienda_status: parsedSettings.identification_number ? "OPERATIONAL" : "CONFIG_REQUIRED",
              atv_environment: parsedSettings.atv_environment || "STAGING",
              tags: parsedSub?.state === "trial" ? ["Trial", "Nuevo"] : ["SaaS", "Activo"],
            });
          }
        }
      }

      // Add general infrastructure alerts if empty
      if (foundAlerts.length === 0) {
        foundAlerts.push({
          id: "alert_infra_1",
          severity: "MEDIUM",
          category: "CREDENTIALS_EXPIRING",
          tenant_id: "org_demo",
          tenant_name: "Supermercado San Pedro",
          title: "Llave Criptográfica ATV por Renovar en 15 Días",
          description: "El certificado .p12 del contribuyente 3-101-555666 expirará el próximo mes.",
          occurred_at: "2026-08-31 16:30",
          recommended_action: "Enviar recordatorio al propietario para descargar nueva llave en ATV Hacienda",
          deep_link: "/superadmin?tab=hacienda",
          status: "OPEN",
        });
      }

      setTenants(foundTenants);
      setAlerts(foundAlerts);
      setTickets(foundTickets);
      setActiveGrants(foundGrants);

      // Load audit logs
      const rawAudit = localStorage.getItem("orbitica_superadmin_audit_logs");
      if (rawAudit) setAuditLogs(JSON.parse(rawAudit));
    } catch (e) {}
  }, []);

  // Save audit log append-only
  const logAuditEvent = (event: Omit<SuperadminAuditEntry, "id" | "created_at" | "session_id" | "ip_address" | "user_agent">) => {
    const newEntry: SuperadminAuditEntry = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      session_id: `sess_${Date.now()}`,
      ip_address: "186.15.220.45 (San José, CR)",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 40) : "Orbítica Hub Core",
    };

    setAuditLogs((prev) => {
      const updated = [newEntry, ...prev];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("orbitica_superadmin_audit_logs", JSON.stringify(updated.slice(0, 500)));
        } catch (e) {}
      }
      return updated;
    });
  };

  // Permission Check
  const hasPermission = (perm: SuperadminPermission): boolean => {
    if (currentRole === "PLATFORM_OWNER") return true;
    if (currentRole === "READ_ONLY") return perm === "tenants:view" || perm === "security:audit";
    if (currentRole === "OPERATIONS") {
      return ["tenants:view", "tenants:mutate", "subscriptions:manage", "support:impersonate", "feature_flags:toggle"].includes(perm);
    }
    if (currentRole === "SUPPORT") {
      return ["tenants:view", "support:impersonate"].includes(perm);
    }
    if (currentRole === "FINANCE") {
      return ["tenants:view", "subscriptions:manage", "pricing:edit", "refunds:execute"].includes(perm);
    }
    if (currentRole === "SECURITY") {
      return ["tenants:view", "security:audit", "comms:broadcast"].includes(perm);
    }
    return false;
  };

  // Step-Up Reauthentication Trigger
  const requestStepUpAuth = (action: string, resource: string, onConfirm: (token: string, reason: string) => void) => {
    setStepUpActionContext({ action, resource, onConfirm });
    setStepUpModalOpen(true);
  };

  const closeStepUpModal = () => {
    setStepUpModalOpen(false);
    setStepUpActionContext(null);
  };

  // Alert Actions
  const resolveAlert = (alertId: string, notes?: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED", resolved_at: new Date().toISOString(), internal_notes: notes || a.internal_notes } : a))
    );
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador Orbítica",
      user_role: currentRole,
      action: "RESOLVE_ALERT",
      resource: `Alert #${alertId}`,
      reason: notes || "Alerta resuelta satisfactoriamente",
      details_masked: { alert_id: alertId, resolution: notes },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  const assignAlert = (alertId: string, assignee: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, assigned_to: assignee, status: "IN_PROGRESS" } : a))
    );
  };

  // Tenant Operations
  const openTenant360 = (tenantId: string) => setSelectedTenantId(tenantId);
  const closeTenant360 = () => setSelectedTenantId(null);
  const selectedTenant360 = tenants.find((t) => t.id === selectedTenantId) || null;

  const updateTenantPlan = (tenantId: string, planId: string, reason: string, stepUpToken?: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, plan_id: planId, state: "active" } : t))
    );
    try {
      const raw = localStorage.getItem(`orbitica_subscription_${tenantId}`);
      const sub = raw ? JSON.parse(raw) : {};
      sub.plan_id = planId;
      sub.state = "active";
      localStorage.setItem(`orbitica_subscription_${tenantId}`, JSON.stringify(sub));
    } catch (e) {}

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "UPDATE_TENANT_PLAN",
      resource: `Tenant #${tenantId}`,
      tenant_id: tenantId,
      reason,
      details_masked: { new_plan: planId, step_up: Boolean(stepUpToken) },
      is_critical: true,
      step_up_confirmed: Boolean(stepUpToken),
    });
  };

  const extendTenantTrial = (tenantId: string, days: number, reason: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, trial_days_left: t.trial_days_left + days, state: "trial" } : t))
    );
    try {
      const raw = localStorage.getItem(`orbitica_subscription_${tenantId}`);
      if (raw) {
        const sub = JSON.parse(raw);
        sub.state = "trial";
        const curEnd = new Date(sub.trial_end_at || new Date());
        curEnd.setDate(curEnd.getDate() + days);
        sub.trial_end_at = curEnd.toISOString().split("T")[0];
        localStorage.setItem(`orbitica_subscription_${tenantId}`, JSON.stringify(sub));
      }
    } catch (e) {}

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "EXTEND_TRIAL",
      resource: `Tenant #${tenantId}`,
      tenant_id: tenantId,
      reason,
      details_masked: { extended_days: days },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  const toggleTenantSuspension = (tenantId: string, reason: string, stepUpToken?: string) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === tenantId) {
          const next = t.state === "suspended" ? "active" : "suspended";
          try {
            const raw = localStorage.getItem(`orbitica_subscription_${tenantId}`);
            if (raw) {
              const sub = JSON.parse(raw);
              sub.state = next;
              localStorage.setItem(`orbitica_subscription_${tenantId}`, JSON.stringify(sub));
            }
          } catch (e) {}
          return { ...t, state: next };
        }
        return t;
      })
    );

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "TOGGLE_TENANT_SUSPENSION",
      resource: `Tenant #${tenantId}`,
      tenant_id: tenantId,
      reason,
      details_masked: { step_up_used: Boolean(stepUpToken) },
      is_critical: true,
      step_up_confirmed: Boolean(stepUpToken),
    });
  };

  const setTenantCustomLimits = (tenantId: string, limits: { users?: number; branches?: number }) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, custom_limits: { ...t.custom_limits, ...limits } } : t))
    );
  };

  // Price Versioning
  const createPriceVersion = (version: Omit<PricePlanVersion, "id" | "created_at">, stepUpToken: string) => {
    const newVer: PricePlanVersion = {
      ...version,
      id: `ver_${version.plan_id}_${Date.now()}`,
      created_at: new Date().toISOString().split("T")[0],
    };
    setPriceVersions((prev) => [newVer, ...prev]);

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "CREATE_PRICE_VERSION",
      resource: `Plan ${version.plan_id}`,
      reason: "Actualización oficial de tarifas SaaS",
      details_masked: { new_monthly: version.monthly_price, new_annual: version.annual_price, effective_date: version.effective_date },
      is_critical: true,
      step_up_confirmed: true,
    });
  };

  // Feature Flags
  const toggleFeatureFlag = (flagKey: string, status: FeatureFlagDefinition["status"], scope: FeatureFlagDefinition["scope"], rolloutPct?: number, stepUpToken?: string) => {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === flagKey ? { ...f, status, scope, rollout_percentage: rolloutPct ?? f.rollout_percentage, updated_at: new Date().toISOString().split("T")[0] } : f))
    );

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "TOGGLE_FEATURE_FLAG",
      resource: `Flag ${flagKey}`,
      reason: "Ajuste de despliegue gradual de función",
      details_masked: { flag: flagKey, next_status: status, scope, rollout_pct: rolloutPct },
      is_critical: scope === "GLOBAL" && status === "ACTIVE",
      step_up_confirmed: Boolean(stepUpToken),
    });
  };

  // Refunds
  const executeRefund = (transactionId: string, amount: number, reason: string, stepUpToken: string): boolean => {
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "EXECUTE_REFUND",
      resource: `Transaction #${transactionId}`,
      reason,
      details_masked: { refund_amount: amount, currency: "CRC", idempotency_check: "PASSED" },
      is_critical: true,
      step_up_confirmed: true,
    });
    return true;
  };

  // Delegated Access Kill-switch
  const revokeDelegatedAccess = (grantId: string, reason: string) => {
    setActiveGrants((prev) => prev.filter((g) => g.id !== grantId));
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "REVOKE_DELEGATED_ACCESS",
      resource: `Grant #${grantId}`,
      reason,
      details_masked: { grant_id: grantId },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  // Tickets
  const replyTicketAsAgent = (ticketId: string, message: string, isInternalNote: boolean = false) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: isInternalNote ? t.status : "WAITING_CLIENT",
            updated_at: new Date().toISOString(),
            messages: [
              ...t.messages,
              {
                id: `msg_${Date.now()}`,
                sender_type: "SUPPORT_AGENT",
                sender_name: "Especialista Orbítica Hub",
                message,
                is_internal_note: isInternalNote,
                created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
              },
            ],
          };
        }
        return t;
      })
    );
  };

  const assignTicket = (ticketId: string, agentName: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "IN_PROGRESS" } : t))
    );
  };

  // Broadcasts & Automations
  const sendBroadcast = (broadcast: Omit<PlatformBroadcast, "id" | "sent_at" | "created_at">) => {
    const newBcast: PlatformBroadcast = {
      ...broadcast,
      id: `bcast_${Date.now()}`,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setBroadcasts((prev) => [newBcast, ...prev]);
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "SEND_BROADCAST",
      resource: `Broadcast: ${broadcast.title}`,
      details_masked: { audience: broadcast.target_audience, channels: broadcast.channels },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  const toggleAutomationRule = (ruleId: string, isEnabled: boolean) => {
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, is_enabled: isEnabled } : r))
    );
  };

  const refreshTechnicalHealth = () => {
    setTechnicalHealth((prev) =>
      prev.map((s) => ({ ...s, latency_ms: Math.floor(15 + Math.random() * 30), last_checked: "Justo ahora" }))
    );
  };

  return (
    <SuperadminContext.Provider
      value={{
        currentRole,
        setCurrentRole,
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
        transactions,
        executeRefund,
        activeGrants,
        revokeDelegatedAccess,
        tickets,
        replyTicketAsAgent,
        assignTicket,
        technicalHealth,
        refreshTechnicalHealth,
        broadcasts,
        sendBroadcast,
        automationRules,
        toggleAutomationRule,
        auditLogs,
        logAuditEvent,
        stepUpModalOpen,
        stepUpActionContext,
        requestStepUpAuth,
        closeStepUpModal,
        commandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
    </SuperadminContext.Provider>
  );
}

export function useSuperadmin() {
  const context = useContext(SuperadminContext);
  if (!context) {
    throw new Error("useSuperadmin must be used within a SuperadminProvider");
  }
  return context;
}
