"use client";

import React from "react";
import { LogOut, Building2, MapPin, CircleDot, Menu } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/ui/brand-logo";

interface TopbarProps {
  onToggleMobileMenu?: () => void;
}

export function Topbar({ onToggleMobileMenu }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#141518]/90 backdrop-blur-md border-b border-[#26282E] fixed top-0 right-0 left-0 lg:left-64 z-20 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Organization info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-[#8E929E] hover:text-white bg-[#1A1B1F] border border-[#26282E] transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Mobile brand badge */}
        <div className="lg:hidden flex items-center gap-1.5">
          <BrandIcon size={24} />
          <span className="font-black text-xs text-white tracking-wider">ORBÍTICA</span>
        </div>

        {/* Desktop Organization Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#0EA5FF]" />
          <span className="font-semibold text-white truncate max-w-[140px] md:max-w-[200px]">
            {user?.organization_name || "Orbítica Studio"}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-[#CFCFD4]">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sucursal Central (001)</span>
        </div>

        <Badge variant="success" className="hidden sm:inline-flex gap-1 text-[11px] py-1">
          <CircleDot className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
          Caja Abierta
        </Badge>
      </div>

      {/* Right: User Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-white truncate max-w-[120px] sm:max-w-none">
            {user?.full_name || "Usuario"}
          </span>
          <span className="text-[9px] text-[#0EA5FF] uppercase font-mono tracking-wider">
            {user?.role || "cajero"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-[#CFCFD4] hover:text-red-400 hover:bg-red-500/10 px-2 sm:px-3 text-xs"
        >
          <LogOut className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}