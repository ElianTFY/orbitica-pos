"use client";

import React from "react";
import Link from "next/link";
import {
  LogOut,
  Building2,
  MapPin,
  CircleDot,
  Menu,
  Sparkles,
  ShieldAlert,
  Lock,
  Clock,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useStore } from "@/features/store/store-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface TopbarProps {
  onToggleMobileMenu?: () => void;
}

export function Topbar({ onToggleMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const {
    settings,
    activeCashSession,
    subscription,
    activeSupportGrant,
    revokeSupportAccess,
  } = useStore();

  const businessName = user?.organization_name || settings.trade_name || "Mi Negocio";
  const branchName = user?.branch_name || settings.branch_name || "Sucursal Central (001)";

  const getDaysLeft = () => {
    if (subscription.state !== "trial") return null;
    const end = new Date(subscription.trial_end_at).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const trialDays = getDaysLeft();

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border fixed top-0 right-0 left-0 lg:left-64 z-20 flex items-center justify-between px-4 sm:px-6 transition-colors">
      {/* Left: Mobile hamburger & Organization info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-text-muted hover:text-text-main bg-surface-secondary border border-border transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Mobile brand badge */}
        <div className="lg:hidden flex items-center gap-1.5">
          <BrandIcon size={24} />
          <span className="font-black text-xs text-text-main tracking-wider">ORBÍTICA</span>
        </div>

        {/* Desktop Organization Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-secondary border border-border rounded-xl text-xs">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-text-main truncate max-w-[140px] md:max-w-[200px]">
            {businessName}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-secondary border border-border rounded-xl text-xs text-text-secondary">
          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
          <span className="truncate max-w-[150px]">{branchName}</span>
        </div>

        {/* Cash Status */}
        <Badge variant={activeCashSession?.status === "OPEN" ? "success" : "default"} className="hidden xl:inline-flex gap-1 text-[11px] py-1">
          <CircleDot className={`w-2.5 h-2.5 ${activeCashSession?.status === "OPEN" ? "text-emerald-500 animate-pulse" : "text-text-muted"}`} />
          {activeCashSession?.status === "OPEN" ? "Caja Abierta" : "Caja Cerrada"}
        </Badge>

        {/* Trial Days Countdown Badge */}
        {subscription?.state === "trial" && (
          <Link href="/subscription">
            <Badge variant="blue" className="gap-1.5 text-[11px] py-1 hover:bg-primary/20 cursor-pointer font-bold animate-in fade-in">
              <Sparkles className="w-3 h-3 text-primary animate-spin" />
              <span>Prueba Crece: {trialDays ?? 14}d restantes</span>
            </Badge>
          </Link>
        )}

        {/* Delegated Support Impersonation Banner */}
        {activeSupportGrant && !activeSupportGrant.is_revoked && (
          <div className="flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 px-2.5 py-1 rounded-xl text-xs font-bold animate-pulse">
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Soporte Activo ({activeSupportGrant.permission_level})</span>
            <button
              onClick={() => revokeSupportAccess()}
              className="text-[10px] underline hover:text-red-500 ml-1"
            >
              Revocar
            </button>
          </div>
        )}
      </div>

      {/* Right: Theme Toggle & User Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />

        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-text-main truncate max-w-[120px] sm:max-w-none">
            {user?.full_name || "Usuario"}
          </span>
          <span className="text-[9px] text-primary uppercase font-mono tracking-wider font-semibold">
            {user?.role === "owner" ? "Propietario" : user?.role || "cajero"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label="Cerrar sesión"
          className="text-text-muted hover:text-red-500 hover:bg-red-500/10 px-2 sm:px-3 text-xs"
        >
          <LogOut className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}