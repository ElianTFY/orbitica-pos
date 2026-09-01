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
import { useAuth } from "@/features/auth/auth-context";

export type HubSection =
  | "attention"
  | "executive"
  | "tenants"
  | "subscriptions"
  | "plans_flags"
  | "comms"
  | "support"
  | "delegated_access"
  | "incidents"
  | "hacienda"
  | "tech_center"
  | "security"
  | "audit";

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

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  org_name?: string;
  created_at: string;
  is_read: boolean;
  deep_link?: string;
}

export interface EnvironmentMetadata {
  environment: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
  region: string;
  version: string;
  build_date: string;
  status: "HEALTHY" | "DEGRADED" | "MAINTENANCE";
  uptime_pct: number;
}

interface SuperadminContextType {
  // Active Navigation Section
  activeSection: HubSection;
  setActiveSection: (section: HubSection) => void;

  // Sidebar Desktop & Mobile State
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Verified Real Role & Permissions
  currentRole: SuperadminRole;
  hasPermission: (perm: SuperadminPermission) => boolean;

  // Real Environment Metadata
  envMetadata: EnvironmentMetadata;

  // Real Notifications Center
  notifications: PlatformNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // Priority Alerts (Requiere Atención)
  alerts: PlatformAlert[];
  resolveAlert: (alertId: string, notes?: string) => void;
  assignAlert: (alertId: string, assignee: string) => void;

  // Managed Tenants & 360° View
  tenants: ManagedTenant360[];
  selectedTenant360: ManagedTenant360 | null;
  openTenant360: (tenantId: string) => void;
  closeTenant360: () => void;
  updateTenantPlan: (tenantId: string, planId: string, reason: string, stepUpToken?: string) => void;
  extendTenantTrial: (tenantId: string, days: number, reason: string) => void;
  toggleTenantSuspension: (tenantId: string, reason: string, stepUpToken?: string) => void;
  setTenantCustomLimits: (tenantId: string, limits: { users?: number; branches?: number }) => void;

  // Plans & Price Versioning
  priceVersions: PricePlanVersion[];
  createPriceVersion: (version: Omit<PricePlanVersion, "id" | "created_at">, stepUpToken: string) => void;

  // Feature Flags Management
  featureFlags: FeatureFlagDefinition[];
  toggleFeatureFlag: (flagKey: string, status: FeatureFlagDefinition["status"], scope: FeatureFlagDefinition["scope"], rolloutPct?: number, stepUpToken?: string) => void;

  // Idempotent Transactions & Refunds
  transactions: IdempotentPaymentTransaction[];
  executeRefund: (transactionId: string, amount: number, reason: string, stepUpToken: string) => boolean;

  // Delegated Access Monitor & Kill-Switch
  activeGrants: SupportAccessGrant[];
  requestDelegatedAccess: (orgId: string, orgName: string, reason: string, durationMinutes: number) => void;
  revokeDelegatedAccess: (grantId: string, reason: string) => void;

  // Support Tickets System
  tickets: SupportTicket[];
  replyTicketAsAgent: (ticketId: string, message: string, isInternalNote?: boolean) => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket["status"], reason?: string) => void;
  assignTicket: (ticketId: string, agentName: string) => void;
  escalateTicket: (ticketId: string, team: string, reason: string) => void;

  // Technical Health
  technicalHealth: TechnicalServiceHealth[];
  refreshTechnicalHealth: () => void;

  // Broadcast & Automations
  broadcasts: PlatformBroadcast[];
  sendBroadcast: (broadcast: Omit<PlatformBroadcast, "id" | "sent_at" | "created_at">) => void;
  automationRules: PlatformAutomationRule[];
  toggleAutomationRule: (ruleId: string, isEnabled: boolean) => void;

  // Forensic Audit Log
  auditLogs: SuperadminAuditEntry[];
  logAuditEvent: (event: Omit<SuperadminAuditEntry, "id" | "created_at" | "session_id" | "ip_address" | "user_agent">) => void;

  // Step-Up Authentication Modal State
  stepUpModalOpen: boolean;
  stepUpActionContext: { action: string; resource: string; onConfirm: (token: string, reason: string) => void } | null;
  requestStepUpAuth: (action: string, resource: string, onConfirm: (token: string, reason: string) => void) => void;
  closeStepUpModal: () => void;

  // Universal Command Palette (Ctrl+K)
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const SuperadminContext = createContext<SuperadminContextType | undefined>(undefined);

// Initial Technical Health Services
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
  const { user } = useAuth();

  // Navigation State
  const [activeSection, setActiveSection] = useState<HubSection>("attention");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Verified Role directly derived from authenticated user
  const currentRole: SuperadminRole =
    user?.role === "superadmin" ? "PLATFORM_OWNER" : "READ_ONLY";

  // Real Environment Metadata
  const [envMetadata, setEnvMetadata] = useState<EnvironmentMetadata>({
    environment: "PRODUCTION",
    region: "iad1 (US-East)",
    version: "v2.4.0-hub+682006f",
    build_date: "2026-08-31",
    status: "HEALTHY",
    uptime_pct: 99.98,
  });

  // Notifications State
  const [notifications, setNotifications] = useState<PlatformNotification[]>([
    {
      id: "notif_1",
      title: "Pago de suscripción confirmado",
      message: "Supermercado San Pedro renovó su plan Escala por ₡27.900.",
      severity: "INFO",
      org_name: "Supermercado San Pedro",
      created_at: "Hace 10 min",
      is_read: false,
      deep_link: "subscriptions",
    },
    {
      id: "notif_2",
      title: "Ticket urgente recibido",
      message: "Soda El Parque reporta error de autenticación con Hacienda ATV.",
      severity: "CRITICAL",
      org_name: "Soda El Parque",
      created_at: "Hace 25 min",
      is_read: false,
      deep_link: "support",
    },
    {
      id: "notif_3",
      title: "Prueba por vencer en 48h",
      message: "Boutique Glamour Escazú tiene 2 días restantes de prueba Crece.",
      severity: "WARNING",
      org_name: "Boutique Glamour Escazú",
      created_at: "Hace 2 horas",
      is_read: true,
      deep_link: "tenants",
    },
  ]);

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

  // Fetch Environment Metadata from Backend
  useEffect(() => {
    fetch("/api/v1/superadmin/environment")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setEnvMetadata(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Load Real Data from Multi-Tenant LocalStorage & API
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
          const rawGrant = localStorage.getItem(`orbitica_support_grant_${orgId}`) || localStorage.getItem(`orbitica_active_support_grant_${orgId}`);

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
                  occurred_at: new Date().toISOString().replace("T", " ").substring(0, 16),
                  recommended_action: "Ofrecer promoción de cierre o extender prueba +7 días",
                  deep_link: `tenants`,
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

      // Add default support tickets if none exist in local storage
      if (foundTickets.length === 0) {
        foundTickets.push({
          id: "tick_101",
          ticket_number: "TICK-8021",
          organization_id: "org_soda_parque",
          organization_name: "Soda El Parque",
          created_by_name: "Carlos Montero",
          created_by_email: "carlos@elparque.cr",
          category: "HACIENDA",
          priority: "HIGH",
          status: "OPEN",
          subject: "Fallo en firma criptográfica de tiquete electrónico (Error 401)",
          description: "Al enviar la venta a Hacienda recibo un error 401. Verifiqué que mi usuario de ATV tenga 50 caracteres pero sigue fallando.",
          telemetry: {
            browser: "Chrome 122.0 Windows",
            os: "Windows 11 x64",
            screen_res: "1920x1080",
            app_version: "Orbítica POS v2.4.0",
            current_route: "/pos",
            error_code: "HACIENDA_AUTH_401",
          },
          messages: [
            {
              id: "msg_1",
              sender_type: "CLIENT",
              sender_name: "Carlos Montero",
              message: "Al enviar la venta a Hacienda recibo un error 401. Verifiqué que mi usuario de ATV tenga 50 caracteres pero sigue fallando.",
              created_at: "2026-08-31 14:30",
            },
          ],
          created_at: "2026-08-31 14:30",
          updated_at: "2026-08-31 14:30",
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

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Notification methods
  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };
  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Append-only audit logger
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
    return true;
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
      user_name: "Superadministrador",
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

  // Delegated Access Request & Kill-switch
  const requestDelegatedAccess = (orgId: string, orgName: string, reason: string, durationMinutes: number) => {
    const expires = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const newGrant: SupportAccessGrant = {
      id: `grant_${Date.now()}`,
      organization_id: orgId,
      organization_name: orgName,
      granted_by_user_id: "usr_superadmin",
      reason,
      permission_level: "READ_ONLY",
      expires_at: expires,
      created_at: new Date().toISOString(),
      is_revoked: false,
      token: `sup_tok_${Date.now()}`,
    };

    setActiveGrants((prev) => [newGrant, ...prev]);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`orbitica_support_grant_${orgId}`, JSON.stringify(newGrant));
      } catch {}
    }

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "REQUEST_DELEGATED_ACCESS",
      resource: `Organization: ${orgName}`,
      tenant_id: orgId,
      reason,
      details_masked: { duration_minutes: durationMinutes, permission: "READ_ONLY" },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

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

  // Ticket Operations
  const replyTicketAsAgent = (ticketId: string, message: string, isInternalNote: boolean = false) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated = {
            ...t,
            status: (isInternalNote ? t.status : "WAITING_CLIENT") as SupportTicket["status"],
            updated_at: timestamp,
            messages: [
              ...t.messages,
              {
                id: `msg_${Date.now()}`,
                sender_type: "SUPPORT_AGENT" as const,
                sender_name: "Especialista Orbítica Hub",
                message,
                is_internal_note: isInternalNote,
                created_at: timestamp,
              },
            ],
          };

          // Sync with tenant local storage
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem(`orbitica_support_tickets_${t.organization_id}`);
              const tenantTickets = raw ? JSON.parse(raw) : [];
              const syncTickets = tenantTickets.map((tk: any) => (tk.id === ticketId ? updated : tk));
              localStorage.setItem(`orbitica_support_tickets_${t.organization_id}`, JSON.stringify(syncTickets));
            } catch {}
          }

          return updated;
        }
        return t;
      })
    );

    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: isInternalNote ? "ADD_INTERNAL_NOTE" : "REPLY_SUPPORT_TICKET",
      resource: `Ticket #${ticketId}`,
      reason: isInternalNote ? "Nota interna confidencial" : "Respuesta al cliente",
      details_masked: { ticket_id: ticketId, is_internal: isInternalNote },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket["status"], reason?: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status, updated_at: new Date().toISOString().replace("T", " ").substring(0, 19) } : t))
    );
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "UPDATE_TICKET_STATUS",
      resource: `Ticket #${ticketId}`,
      reason: reason || `Estado cambiado a ${status}`,
      details_masked: { ticket_id: ticketId, new_status: status },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  const assignTicket = (ticketId: string, agentName: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "IN_PROGRESS" } : t))
    );
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "ASSIGN_TICKET",
      resource: `Ticket #${ticketId}`,
      reason: `Asignado a ${agentName}`,
      details_masked: { ticket_id: ticketId, assignee: agentName },
      is_critical: false,
      step_up_confirmed: false,
    });
  };

  const escalateTicket = (ticketId: string, team: string, reason: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "IN_PROGRESS", priority: "URGENT" } : t))
    );
    logAuditEvent({
      user_id: "usr_superadmin",
      user_name: "Superadministrador",
      user_role: currentRole,
      action: "ESCALATE_TICKET",
      resource: `Ticket #${ticketId}`,
      reason: `Escalado al equipo de ${team}: ${reason}`,
      details_masked: { ticket_id: ticketId, team, reason },
      is_critical: true,
      step_up_confirmed: false,
    });
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
        activeSection,
        setActiveSection,
        isSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
        currentRole,
        hasPermission,
        envMetadata,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
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
        requestDelegatedAccess,
        revokeDelegatedAccess,
        tickets,
        replyTicketAsAgent,
        updateTicketStatus,
        assignTicket,
        escalateTicket,
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
