"use client";

import React from "react";
import { LogOut, Building2, MapPin, CircleDot } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#141518]/80 backdrop-blur-md border-b border-[#26282E] fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-6">
      {/* Branch & Session Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1B1F] border border-[#26282E] rounded-lg text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#0EA5FF]" />
          <span className="font-semibold text-white truncate max-w-[180px]">
            {user?.organization_name || "Orbítica Studio"}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1B1F] border border-[#26282E] rounded-lg text-xs text-[#CFCFD4]">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sucursal Central (001)</span>
        </div>

        <Badge variant="success" className="gap-1.5">
          <CircleDot className="w-3 h-3 text-emerald-400" />
          Caja Abierta
        </Badge>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-white">{user?.full_name || "Usuario"}</span>
          <span className="text-[10px] text-[#0EA5FF] uppercase font-mono">{user?.role || "cajero"}</span>
        </div>

        <Button variant="ghost" size="sm" onClick={logout} className="text-[#CFCFD4] hover:text-red-400 hover:bg-red-500/10">
          <LogOut className="w-4 h-4 mr-1.5" />
          Salir
        </Button>
      </div>
    </header>
  );
}
