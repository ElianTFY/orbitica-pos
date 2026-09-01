"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  X,
  Command,
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
  LogOut,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
  Clock,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Shield,
  FileCheck2,
  AlertCircle,
  RadioTower,
  Eye,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import {
  SuperadminProvider,
  useSuperadmin,
  HubSection,
} from "@/features/superadmin/superadmin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  id: HubSection;
  label: string;
  icon: any;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function SuperadminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const {
    activeSection,
    setActiveSection,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    currentRole,
    envMetadata,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    alerts,
    tickets,
    stepUpModalOpen,
    stepUpActionContext,
    closeStepUpModal,
    commandPaletteOpen,
    setCommandPaletteOpen,
    openTenant360,
  } = useSuperadmin();

  // Dropdown states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Step-Up Modal States
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpReason, setStepUpReason] = useState("");
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [isProcessingStepUp, setIsProcessingStepUp] = useState(false);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ companies: any[]; tickets: any[] }>({ companies: [], tickets: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        closeStepUpModal();
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ companies: [], tickets: [] });
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/v1/superadmin/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setSearchResults({
              companies: json.data.companies || [],
              tickets: json.data.tickets || [],
            });
          }
        })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Guard
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "superadmin") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold text-text-muted">
          Validando credenciales administrativas en backend...
        </span>
      </div>
    );
  }

  // Handle Step-Up Confirm
  const handleConfirmStepUp = (e: React.FormEvent) => {
    e.preventDefault();
    setStepUpError(null);

    if (!stepUpPassword.trim()) {
      setStepUpError("Ingresa tu contraseña administrativa.");
      return;
    }
    if (!stepUpReason.trim() || stepUpReason.trim().length < 10) {
      setStepUpError("Debes justificar el motivo con al menos 10 caracteres para auditoría.");
      return;
    }

    setIsProcessingStepUp(true);
    fetch("/api/v1/superadmin/security/step-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: stepUpPassword.trim(),
        reason: stepUpReason.trim(),
        action: stepUpActionContext?.action || "CRITICAL_ACTION",
        target_resource: stepUpActionContext?.resource || "GLOBAL",
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.step_up_token) {
          if (stepUpActionContext) {
            stepUpActionContext.onConfirm(json.data.step_up_token, stepUpReason.trim());
          }
          setStepUpPassword("");
          setStepUpReason("");
          closeStepUpModal();
        } else {
          setStepUpError(json.error?.message || "Contraseña de reautenticación inválida");
        }
      })
      .catch(() => {
        setStepUpError("Error de conexión al reautenticar");
      })
      .finally(() => {
        setIsProcessingStepUp(false);
      });
  };

  const openAlertsCount = alerts.filter((a) => a.status !== "RESOLVED").length;
  const openTicketsCount = tickets.filter((t) => t.status === "OPEN" || t.status === "WAITING_CLIENT").length;

  // Navigation Groups Definition (Collapsible Sidebar)
  const navGroups: NavGroup[] = [
    {
      title: "OPERACIÓN",
      items: [
        { id: "attention", label: "Requiere atención", icon: Flame, badge: openAlertsCount },
        { id: "executive", label: "Dashboard ejecutivo", icon: Activity },
        { id: "tenants", label: "Empresas & 360°", icon: Building2 },
        { id: "subscriptions", label: "Suscripciones y pagos", icon: CreditCard },
      ],
    },
    {
      title: "PRODUCTO",
      items: [
        { id: "plans_flags", label: "Planes y precios", icon: Sliders },
        { id: "comms", label: "Comunicaciones", icon: Zap },
      ],
    },
    {
      title: "ATENCIÓN",
      items: [
        { id: "support", label: "Mesa de Soporte", icon: LifeBuoy, badge: openTicketsCount },
        { id: "delegated_access", label: "Accesos delegados", icon: KeyRound },
        { id: "incidents", label: "Incidentes", icon: AlertTriangle },
      ],
    },
    {
      title: "PLATAFORMA",
      items: [
        { id: "hacienda", label: "Hacienda ATV v4.4", icon: FileCheck2 },
        { id: "tech_center", label: "Centro técnico", icon: Radio },
        { id: "security", label: "Seguridad y sesiones", icon: Shield },
        { id: "audit", label: "Auditoría forense", icon: ShieldCheck },
      ],
    },
  ];

  // Environment Bar Theme
  const envBg =
    envMetadata.environment === "PRODUCTION"
      ? "bg-red-600 dark:bg-red-700 text-white"
      : envMetadata.environment === "STAGING"
      ? "bg-amber-600 dark:bg-amber-700 text-white"
      : "bg-blue-600 dark:bg-blue-700 text-white";

  const getSectionTitle = () => {
    for (const g of navGroups) {
      const item = g.items.find((it) => it.id === activeSection);
      if (item) return item.label;
    }
    return "Mando Central";
  };

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col font-sans">
      {/* 1. DYNAMIC ENVIRONMENT BAR */}
      <div className={`${envBg} px-4 py-1 text-[11px] font-black tracking-wide flex items-center justify-between shadow-sm z-50`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span>AMBIENTE: {envMetadata.environment} (COSTA RICA)</span>
          <span className="hidden sm:inline opacity-80">· Región: {envMetadata.region}</span>
          <span className="hidden md:inline opacity-80">· Versión: {envMetadata.version}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>EN VIVO</span>
          </span>
          <span className="opacity-80">{envMetadata.build_date}</span>
        </div>
      </div>

      {/* Main Container with Sidebar + Workspace */}
      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* 2. COLLAPSIBLE PROFESSIONAL SIDEBAR */}
        <aside
          className={`bg-surface border-r border-border flex flex-col fixed lg:static top-0 bottom-0 left-0 z-40 transition-all duration-200 ease-in-out ${
            isMobileSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
          } ${isSidebarCollapsed ? "lg:w-16" : "lg:w-64"}`}
        >
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-surface">
            <Link href="/superadmin" className="flex items-center gap-2.5 min-w-0">
              <BrandIcon size={28} />
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-xs tracking-wider text-text-main truncate">ORBÍTICA HUB</span>
                  <span className="text-[9px] font-mono text-primary font-bold">SUPERADMIN</span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-text-muted hover:text-text-main"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Groups */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!isSidebarCollapsed && (
                  <span className="text-[10px] font-mono uppercase font-bold text-text-muted px-2 block">
                    {group.title}
                  </span>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "text-text-secondary hover:text-text-main hover:bg-surface-secondary"
                      } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isSidebarCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                      {!isSidebarCollapsed && typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                            isActive ? "bg-white text-primary" : "bg-primary/20 text-primary"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer Collapse Toggle */}
          <div className="p-3 border-t border-border hidden lg:flex items-center justify-between bg-surface">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-mono text-text-muted">Orbítica SaaS Core</span>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-main transition-colors mx-auto"
              title={isSidebarCollapsed ? "Expandir barra" : "Colapsar barra"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* 3. WORKSPACE AREA */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Single Functional Topbar Header */}
          <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
            {/* Left: Mobile Toggle & Section Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-border hover:bg-surface-secondary text-text-main"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Superadmin Hub</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-xs font-black text-text-main">{getSectionTitle()}</span>
                </div>
              </div>
            </div>

            {/* Right: Search, Notifications, Theme, Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Single Global Search Button */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary border border-border rounded-xl text-xs text-text-muted hover:text-text-main transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buscar empresas, tickets...</span>
                <kbd className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border">Ctrl+K</kbd>
              </button>

              {/* Real Notifications Center Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 rounded-xl border border-border hover:bg-surface-secondary text-text-secondary relative transition-colors"
                  aria-label="Notificaciones del sistema"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-xs font-black text-text-main">Notificaciones del Sistema</span>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Marcar todas leídas
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.deep_link) setActiveSection(n.deep_link as HubSection);
                            setIsNotifOpen(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            n.is_read ? "bg-surface border-border/50 opacity-70" : "bg-primary/5 border-primary/30"
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] mb-0.5">
                            <span className="font-bold text-text-main truncate">{n.title}</span>
                            <span className="text-text-muted">{n.created_at}</span>
                          </div>
                          <p className="text-[11px] text-text-secondary line-clamp-2">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle (Light / Dark / Contrast) */}
              <ThemeToggle />

              {/* Admin Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-border hover:bg-surface-secondary transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-text-main max-w-[120px] truncate">
                    {user.full_name || "Superadmin"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-text-muted" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in zoom-in-95">
                    <div className="border-b border-border pb-2">
                      <span className="text-xs font-black text-text-main block truncate">{user.full_name}</span>
                      <span className="text-[10px] font-mono text-text-muted block truncate">{user.email}</span>
                      <div className="mt-1.5 flex items-center gap-1">
                        <Badge variant="blue" className="text-[10px]">
                          {currentRole === "PLATFORM_OWNER" ? "Propietario de plataforma" : "Solo Lectura"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="p-2 bg-surface-secondary rounded-xl text-[11px] text-text-muted space-y-1">
                        <p>• Sesión autenticada en backend</p>
                        <p>• 2FA Activo en plataforma</p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={logout}
                        className="w-full text-xs font-bold gap-1.5 justify-center"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Cerrar Sesión Segura
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Pane */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* 4. UNIVERSAL COMMAND PALETTE MODAL (Ctrl+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20">
          <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative">
              <Search className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresas, cédulas, propietarios o tickets..."
                className="pl-11 pr-10 py-3 text-sm font-medium"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {searchQuery.trim() === "" ? (
                <div className="p-4 text-center text-xs text-text-muted space-y-2">
                  <Command className="w-6 h-6 mx-auto text-text-muted/50" />
                  <p className="font-bold">Escribe para consultar la base de datos real de Orbítica Hub</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2 text-[10px]">
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Empresas</span>
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Cédulas</span>
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Tickets</span>
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Invoices</span>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Buscando en registros...
                </div>
              ) : (
                <>
                  {/* Companies results */}
                  {searchResults.companies.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-text-muted px-2">
                        Empresas ({searchResults.companies.length})
                      </span>
                      {searchResults.companies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCommandPaletteOpen(false);
                            setActiveSection("tenants");
                            openTenant360(c.id);
                          }}
                          className="w-full p-2.5 rounded-xl bg-surface-secondary/50 hover:bg-primary/10 border border-transparent hover:border-primary/30 flex items-center justify-between text-xs text-left transition-colors"
                        >
                          <div>
                            <span className="font-bold text-text-main block">{c.trade_name}</span>
                            <span className="text-[10px] text-text-muted">{c.legal_name} · Céd: {c.cedula}</span>
                          </div>
                          <Badge variant="blue" className="capitalize">{c.plan}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tickets results */}
                  {searchResults.tickets.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-text-muted px-2">
                        Tickets de Soporte ({searchResults.tickets.length})
                      </span>
                      {searchResults.tickets.map((tk) => (
                        <button
                          key={tk.id}
                          onClick={() => {
                            setCommandPaletteOpen(false);
                            setActiveSection("support");
                          }}
                          className="w-full p-2.5 rounded-xl bg-surface-secondary/50 hover:bg-primary/10 border border-transparent hover:border-primary/30 flex items-center justify-between text-xs text-left transition-colors"
                        >
                          <div>
                            <span className="font-bold text-text-main block">#{tk.ticket_number} — {tk.subject}</span>
                            <span className="text-[10px] text-text-muted">{tk.org_name}</span>
                          </div>
                          <Badge variant="warning">{tk.status}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.companies.length === 0 && searchResults.tickets.length === 0 && (
                    <div className="p-6 text-center text-xs text-text-muted">
                      No se encontraron resultados para "{searchQuery}".
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. STEP-UP REAUTHENTICATION MODAL FOR CRITICAL ACTIONS */}
      {stepUpModalOpen && stepUpActionContext && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-red-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="border-b border-border pb-3 flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500 flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="danger">OPERACIÓN CRÍTICA PROTEGIDA</Badge>
                <h3 className="text-sm font-black text-text-main mt-1">
                  Reautenticación Administrativa Obligatoria
                </h3>
                <p className="text-xs text-text-muted">
                  Estás a punto de ejecutar: <strong>{stepUpActionContext.action}</strong> en <strong>{stepUpActionContext.resource}</strong>.
                </p>
              </div>
            </div>

            {stepUpError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{stepUpError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmStepUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Contraseña Administrativa *
                </label>
                <Input
                  type="password"
                  required
                  value={stepUpPassword}
                  onChange={(e) => setStepUpPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña para autorizar"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Justificación / Motivo Obligatorio (Auditoría) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={stepUpReason}
                  onChange={(e) => setStepUpReason(e.target.value)}
                  placeholder="Explica el motivo técnico o comercial de esta operación crítica..."
                  className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-text-main resize-none"
                />
              </div>

              <div className="p-3 bg-surface-secondary border border-border rounded-xl text-[11px] text-text-muted space-y-1">
                <p>• Esta acción quedará registrada inalterablemente en el log forense de auditoría.</p>
                <p>• Se emitirá un token con validez de 5 minutos.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeStepUpModal}
                  disabled={isProcessingStepUp}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={isProcessingStepUp}
                  className="text-xs font-bold gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {isProcessingStepUp ? "Validando..." : "Confirmar y Ejecutar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperadminProvider>
      <SuperadminLayoutInner>{children}</SuperadminLayoutInner>
    </SuperadminProvider>
  );
}
