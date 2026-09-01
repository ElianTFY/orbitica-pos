"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { SuperadminProvider, useSuperadmin } from "@/features/superadmin/superadmin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SuperadminRole } from "@/types";

function SuperadminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const {
    currentRole,
    setCurrentRole,
    alerts,
    tenants,
    tickets,
    stepUpModalOpen,
    stepUpActionContext,
    closeStepUpModal,
    commandPaletteOpen,
    setCommandPaletteOpen,
    openTenant360,
  } = useSuperadmin();

  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpReason, setStepUpReason] = useState("");
  const [stepUpConfirmText, setStepUpConfirmText] = useState("");
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [isProcessingStepUp, setIsProcessingStepUp] = useState(false);

  // Command palette search
  const [searchQuery, setSearchQuery] = useState("");

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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen]);

  // Auth Protection Guard
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
          Validando credenciales de superadministración...
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
    setTimeout(() => {
      const generatedToken = `stepup_${Date.now()}`;
      if (stepUpActionContext) {
        stepUpActionContext.onConfirm(generatedToken, stepUpReason.trim());
      }
      setIsProcessingStepUp(false);
      setStepUpPassword("");
      setStepUpReason("");
      setStepUpConfirmText("");
      closeStepUpModal();
    }, 500);
  };

  // Filter command palette results
  const filteredTenants = searchQuery.trim()
    ? tenants.filter(
        (t) =>
          t.trade_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.identification_number.includes(searchQuery) ||
          t.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredTickets = searchQuery.trim()
    ? tickets.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const openAlertsCount = alerts.filter((a) => a.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col">
      {/* 1. PERMANENT PRODUCTION ENVIRONMENT WARNING BANNER */}
      <div className="bg-red-600 dark:bg-red-700 text-white px-4 py-1.5 text-xs font-black tracking-wide flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 animate-pulse" />
          <span>🔴 AMBIENTE: PRODUCCIÓN (COSTA RICA - OPERACIÓN EN VIVO)</span>
          <span className="hidden md:inline font-normal text-[11px] opacity-90">
            • Toda acción administrativa tiene impacto directo e inalterable en auditoría
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="px-2 py-0.5 bg-black/20 hover:bg-black/40 rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
          >
            <Command className="w-3 h-3" />
            <span>Buscar (Ctrl+K)</span>
          </button>
          <span className="text-[10px] font-mono opacity-80">v2.4.0-hub</span>
        </div>
      </div>

      {/* 2. TOPBAR FOR SUPERADMIN */}
      <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/superadmin" className="flex items-center gap-2">
            <BrandIcon size={28} />
            <div className="flex flex-col">
              <span className="font-black text-xs tracking-wider text-text-main">ORBÍTICA HUB</span>
              <span className="text-[9px] font-mono text-primary font-bold">SUPERADMIN MASTER</span>
            </div>
          </Link>

          {openAlertsCount > 0 && (
            <Badge variant="danger" className="animate-pulse gap-1 text-[10px] py-0.5">
              <Flame className="w-3 h-3" />
              {openAlertsCount} Requiere Atención
            </Badge>
          )}
        </div>

        {/* Center: Internal RBAC Role Switcher (Audit simulation) */}
        <div className="hidden lg:flex items-center gap-1 bg-surface-secondary border border-border p-1 rounded-2xl">
          <span className="text-[10px] font-bold text-text-muted px-2">Rol Interno:</span>
          {(
            [
              { id: "PLATFORM_OWNER", label: "Propietario" },
              { id: "OPERATIONS", label: "Operaciones" },
              { id: "SUPPORT", label: "Soporte" },
              { id: "FINANCE", label: "Finanzas" },
              { id: "SECURITY", label: "Seguridad" },
              { id: "READ_ONLY", label: "Solo Lectura" },
            ] as Array<{ id: SuperadminRole; label: string }>
          ).map((r) => (
            <button
              key={r.id}
              onClick={() => setCurrentRole(r.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                currentRole === r.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-secondary border border-border rounded-xl text-xs text-text-muted hover:text-text-main transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar empresa, ticket...</span>
            <kbd className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border">Ctrl+K</kbd>
          </button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-xs text-text-muted hover:text-red-500 hover:bg-red-500/10 font-bold gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {children}
      </main>

      {/* 4. UNIVERSAL COMMAND PALETTE MODAL (Ctrl+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20">
          <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative">
              <Search className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar empresas, cédulas, propietarios, tickets o acciones..."
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
                  <p className="font-bold">Escribe para buscar instantáneamente en todo Orbítica Hub</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2 text-[10px]">
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Empresas</span>
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Cédulas</span>
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Tickets</span>
                    <span className="px-2 py-0.5 bg-surface-secondary rounded border border-border">Alertas</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Companies results */}
                  {filteredTenants.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-text-muted px-2">
                        Empresas Registradas ({filteredTenants.length})
                      </span>
                      {filteredTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setCommandPaletteOpen(false);
                            openTenant360(t.id);
                          }}
                          className="w-full p-2.5 rounded-xl bg-surface-secondary/50 hover:bg-primary/10 border border-transparent hover:border-primary/30 flex items-center justify-between text-xs text-left transition-colors"
                        >
                          <div>
                            <span className="font-bold text-text-main block">{t.trade_name}</span>
                            <span className="text-[10px] text-text-muted">{t.legal_name} · Céd: {t.identification_number}</span>
                          </div>
                          <Badge variant="blue" className="capitalize">{t.plan_id}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tickets results */}
                  {filteredTickets.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-text-muted px-2">
                        Tickets de Soporte ({filteredTickets.length})
                      </span>
                      {filteredTickets.map((tk) => (
                        <div
                          key={tk.id}
                          className="p-2.5 rounded-xl bg-surface-secondary/50 border border-border flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-text-main block">#{tk.ticket_number} — {tk.subject}</span>
                            <span className="text-[10px] text-text-muted">{tk.organization_name}</span>
                          </div>
                          <Badge variant="warning">{tk.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredTenants.length === 0 && filteredTickets.length === 0 && (
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
                  Contraseña Administrativa / Token 2FA *
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
                  Justificación / Motivo Obligatorio (Auditoría Forense) *
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
                  {isProcessingStepUp ? "Validando..." : "Confirmar y Ejecutar Acción"}
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
