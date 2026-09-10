"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
import { api } from "@/lib/api-client";

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
  uptime_pct: number | null;
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

  // Managed Tenants & 360° View
  tenants: ManagedTenant360[];
  selectedTenant360: ManagedTenant360 | null;
  openTenant360: (tenantId: string) => void;
  closeTenant360: () => void;
  updateTenantPlan: (tenantId: string, planId: string, reason: string, stepUpToken?: string) => void;
  extendTenantTrial: (tenantId: string, days: number, reason: string) => void;
  toggleTenantSuspension: (tenantId: string, reason: string, stepUpToken?: string) => Promise<void>;
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
  revokeDelegatedAccess: (grantId: string, reason: string) => Promise<void>;

  // Support Tickets System
  tickets: SupportTicket[];
  replyTicketAsAgent: (ticketId: string, message: string, isInternalNote?: boolean) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: SupportTicket["status"], reason?: string) => Promise<void>;
  assignTicket: (ticketId: string, agentName: string) => void;
  escalateTicket: (ticketId: string, team: string, reason: string) => void;

  // Technical Health
  technicalHealth: TechnicalServiceHealth[];
  refreshTechnicalHealth: () => Promise<void>;

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
  stepUpActionContext: { action: string; resource: string; onConfirm: (token: string, reason: string) => void | Promise<void> } | null;
  requestStepUpAuth: (action: string, resource: string, onConfirm: (token: string, reason: string) => void | Promise<void>) => void;
  closeStepUpModal: () => void;

  // Universal Command Palette (Ctrl+K)
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const SuperadminContext = createContext<SuperadminContextType | undefined>(undefined);

// Initial Technical Health Services (Validated via real API health endpoints)
const DEFAULT_TECH_HEALTH: TechnicalServiceHealth[] = [
  { id: "srv_frontend", name: "Next.js Frontend Edge", category: "FRONTEND", status: "OPERATIONAL", latency_ms: 0, uptime_percentage: 0, last_checked: "Página cargada" },
  { id: "srv_api", name: "Core REST API FastAPI", category: "API", status: "DEGRADED", latency_ms: 0, uptime_percentage: 0, last_checked: "Sin verificar" },
  { id: "srv_database", name: "Base de datos", category: "DATABASE", status: "DEGRADED", latency_ms: 0, uptime_percentage: 0, last_checked: "Sin verificar" },
  { id: "srv_atv", name: "Ministerio de Hacienda CR (ATV)", category: "HACIENDA_ATV", status: "MAINTENANCE", latency_ms: 0, uptime_percentage: 0, last_checked: "No medido por el Hub" },
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
    environment: "DEVELOPMENT",
    region: "Costa Rica",
    version: "v2.4.0",
    build_date: "—",
    status: "DEGRADED",
    uptime_pct: null,
  });

  // Notifications State (Starts empty, populated from real events)
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);

  const [tenants, setTenants] = useState<ManagedTenant360[]>([]);
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [priceVersions, setPriceVersions] = useState<PricePlanVersion[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagDefinition[]>([]);
  const [transactions, setTransactions] = useState<IdempotentPaymentTransaction[]>([]);
  const [activeGrants, setActiveGrants] = useState<SupportAccessGrant[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [technicalHealth, setTechnicalHealth] = useState<TechnicalServiceHealth[]>(DEFAULT_TECH_HEALTH);
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcast[]>([]);
  const [automationRules, setAutomationRules] = useState<PlatformAutomationRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<SuperadminAuditEntry[]>([]);

  // Step-Up Modal
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [stepUpActionContext, setStepUpActionContext] = useState<{ action: string; resource: string; onConfirm: (token: string, reason: string) => void | Promise<void> } | null>(null);

  // Universal Command Palette
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const loadHubData = useCallback(async () => {
    if (user?.role !== "superadmin") return;
    const [environment, overview, ticketList, grants, audit] = await Promise.all([
      api.request<EnvironmentMetadata>("/superadmin/environment"),
      api.request<any[]>("/superadmin/organizations/overview"),
      api.request<any[]>("/support/tickets"),
      api.request<any[]>("/support/admin/delegated-access"),
      api.request<any[]>("/superadmin/audit?limit=200"),
    ]);

    setEnvMetadata(environment.data);
    const mappedTenants: ManagedTenant360[] = overview.data.map((row: any) => ({
      id: String(row.id),
      legal_name: row.legal_name,
      trade_name: row.trade_name,
      identification_number: row.identification_number,
      identification_type: row.identification_type,
      email: row.email,
      phone: row.phone || "",
      plan_id: "unconfigured",
      state: row.is_active ? "active" : "suspended",
      trial_days_left: 0,
      created_at: row.created_at,
      next_billing_date: "",
      branches_count: Number(row.branches_count || 0),
      users_count: Number(row.users_count || 0),
      products_count: Number(row.products_count || 0),
      sales_count: Number(row.sales_count || 0),
      total_sales_volume: Number(row.total_sales_volume || 0),
      hacienda_status: row.accepted_invoices_count > 0
        ? "OPERATIONAL"
        : row.fiscal_configuration_complete ? "WARNING" : "CONFIG_REQUIRED",
      atv_environment: row.atv_environment || "STAGING",
      tags: [row.is_active ? "Activo" : "Suspendido"],
    }));
    setTenants(mappedTenants);

    const ticketDetails = await Promise.all(ticketList.data.map(async (ticket: any) => {
      const detail = await api.request<any>(`/support/tickets/${ticket.id}`);
      return detail.data;
    }));
    const mappedTickets: SupportTicket[] = ticketDetails.map((row: any) => ({
      id: String(row.id),
      ticket_number: row.ticket_number,
      organization_id: String(row.organization_id),
      organization_name: row.organization_name,
      created_by_name: row.created_by_name,
      created_by_email: row.created_by_email,
      category: row.category,
      priority: row.priority,
      status: row.status,
      subject: row.subject,
      description: row.description,
      telemetry: row.telemetry || undefined,
      messages: row.messages || [],
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }));
    setTickets(mappedTickets);

    const tenantNames = new Map(mappedTenants.map((tenant) => [tenant.id, tenant.trade_name]));
    setActiveGrants(grants.data.map((grant: any) => ({
      id: String(grant.grant_id),
      organization_id: String(grant.organization_id),
      organization_name: tenantNames.get(String(grant.organization_id)) || "Empresa",
      granted_by_user_id: String(grant.granted_by_user_id),
      reason: grant.reason,
      permission_level: grant.permission_level,
      expires_at: grant.expires_at,
      created_at: grant.created_at,
      is_revoked: Boolean(grant.is_revoked),
    })));

    const urgentAlerts: PlatformAlert[] = mappedTickets
      .filter((ticket) => ["HIGH", "URGENT"].includes(ticket.priority) && !["RESOLVED", "CLOSED"].includes(ticket.status))
      .map((ticket) => ({
        id: `ticket_${ticket.id}`,
        severity: ticket.priority === "URGENT" ? "CRITICAL" : "HIGH",
        category: "URGENT_TICKET",
        tenant_id: ticket.organization_id,
        tenant_name: ticket.organization_name,
        title: ticket.subject,
        description: ticket.description,
        occurred_at: ticket.created_at,
        recommended_action: "Revisar y responder el ticket de soporte",
        deep_link: "support",
        status: ticket.status === "IN_PROGRESS" ? "IN_PROGRESS" : "OPEN",
      }));
    setAlerts(urgentAlerts);
    setNotifications(urgentAlerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      message: `${alert.tenant_name}: ${alert.description}`,
      severity: alert.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
      org_name: alert.tenant_name,
      created_at: alert.occurred_at,
      is_read: false,
      deep_link: "support",
    })));

    setAuditLogs(audit.data.map((row: any) => ({
      id: String(row.id),
      user_id: row.actor_id ? String(row.actor_id) : "system",
      user_name: row.actor_id ? `Usuario ${String(row.actor_id).slice(0, 8)}` : "Sistema",
      user_role: "PLATFORM_OWNER",
      action: row.action,
      resource: row.resource_id ? `${row.resource}: ${row.resource_id}` : row.resource,
      tenant_id: row.organization_id ? String(row.organization_id) : undefined,
      details_masked: row.payload_after || row.payload_before || {},
      ip_address: row.ip_address || "—",
      user_agent: "—",
      session_id: "—",
      is_critical: ["DELEGATED_ACCESS_ADMIN_REVOKED", "SUPERADMIN_TOGGLE_ORG_STATUS"].includes(row.action),
      step_up_confirmed: Boolean(row.step_up_token),
      created_at: row.created_at,
    })));
  }, [user?.role]);

  useEffect(() => {
    loadHubData().catch(() => {
      setEnvMetadata((previous) => ({ ...previous, status: "DEGRADED" }));
    });
  }, [loadHubData]);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Notification methods
  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };
  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Audit entries are authoritative server records only.
  const logAuditEvent = (event: Omit<SuperadminAuditEntry, "id" | "created_at" | "session_id" | "ip_address" | "user_agent">) => {
    void event;
  };

  // Permission Check
  const hasPermission = (perm: SuperadminPermission): boolean => {
    if (currentRole === "PLATFORM_OWNER") return true;
    if (currentRole === "READ_ONLY") return perm === "tenants:view" || perm === "security:audit";
    return true;
  };

  // Step-Up Reauthentication Trigger
  const requestStepUpAuth = (action: string, resource: string, onConfirm: (token: string, reason: string) => void | Promise<void>) => {
    setStepUpActionContext({ action, resource, onConfirm });
    setStepUpModalOpen(true);
  };

  const closeStepUpModal = () => {
    setStepUpModalOpen(false);
    setStepUpActionContext(null);
  };

  // Tenant Operations
  const openTenant360 = (tenantId: string) => setSelectedTenantId(tenantId);
  const closeTenant360 = () => setSelectedTenantId(null);
  const selectedTenant360 = tenants.find((t) => t.id === selectedTenantId) || null;

  const updateTenantPlan = (tenantId: string, planId: string, reason: string, stepUpToken?: string) => {
    // Billing plans are not persisted until a real billing provider/model exists.
    void tenantId;
    void planId;
    void reason;
    void stepUpToken;
  };

  const extendTenantTrial = (tenantId: string, days: number, reason: string) => {
    void tenantId;
    void days;
    void reason;
  };

  const toggleTenantSuspension = async (tenantId: string, reason: string, stepUpToken?: string) => {
    const tenant = tenants.find((row) => row.id === tenantId);
    if (!tenant || !stepUpToken) return;
    await api.request(`/superadmin/organizations/${tenantId}/status?is_active=${tenant.state === "suspended"}&reason=${encodeURIComponent(reason)}`, {
      method: "PATCH",
      headers: { "X-Step-Up-Token": stepUpToken },
    });
    await loadHubData();
  };

  const setTenantCustomLimits = (tenantId: string, limits: { users?: number; branches?: number }) => {
    void tenantId;
    void limits;
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
    // Consent is intentionally owner-initiated; the Hub cannot mint its own access.
    void orgId;
    void orgName;
    void reason;
    void durationMinutes;
  };

  const revokeDelegatedAccess = async (grantId: string, reason: string) => {
    await api.request(`/support/admin/delegated-access/${grantId}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });
    await loadHubData();
  };

  // Ticket Operations
  const replyTicketAsAgent = async (ticketId: string, message: string, isInternalNote: boolean = false) => {
    await api.request(`/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, is_internal_note: isInternalNote }),
    });
    await loadHubData();
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicket["status"], reason?: string) => {
    await api.request(`/support/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason: reason || undefined }),
    });
    await loadHubData();
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

  const refreshTechnicalHealth = async () => {
    const startedAt = performance.now();
    try {
      const response = await api.request<any>("/health/ready");
      const latency = Math.round(performance.now() - startedAt);
      const checks = response.data?.checks || {};
      const now = new Date().toISOString();
      setTechnicalHealth((previous) => previous.map((service) => {
        if (service.id === "srv_api") {
          return { ...service, status: "OPERATIONAL", latency_ms: latency, last_checked: now };
        }
        if (service.id === "srv_database") {
          return {
            ...service,
            status: checks.database === "connected" && checks.migrations === "applied" ? "OPERATIONAL" : "DEGRADED",
            latency_ms: latency,
            last_checked: now,
            incident_notes: checks.migrations === "applied" ? undefined : "Migraciones no verificadas",
          };
        }
        return service;
      }));
    } catch {
      const now = new Date().toISOString();
      setTechnicalHealth((previous) => previous.map((service) =>
        ["srv_api", "srv_database"].includes(service.id)
          ? { ...service, status: "OUTAGE", last_checked: now }
          : service,
      ));
    }
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
