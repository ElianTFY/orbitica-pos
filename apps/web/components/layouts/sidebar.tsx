"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Boxes,
  Users,
  Truck,
  DollarSign,
  FileText,
  BarChart3,
  UserCog,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "org:read" },
  { name: "Punto de Venta", href: "/pos", icon: ShoppingCart, perm: "pos:read", highlight: true },
  { name: "Ventas", href: "/sales", icon: Receipt, perm: "pos:read" },
  { name: "Productos", href: "/products", icon: Package, perm: "catalog:read" },
  { name: "Inventario", href: "/inventory", icon: Boxes, perm: "inventory:read" },
  { name: "Clientes", href: "/customers", icon: Users, perm: "pos:read" },
  { name: "Proveedores", href: "/suppliers", icon: Truck, perm: "catalog:read" },
  { name: "Caja", href: "/cash-register", icon: DollarSign, perm: "cash:open" },
  { name: "Facturación", href: "/invoicing", icon: FileText, perm: "invoicing:read" },
  { name: "Reportes", href: "/reports", icon: BarChart3, perm: "reports:read" },
  { name: "Empleados", href: "/employees", icon: UserCog, perm: "user:read" },
  { name: "Configuración", href: "/settings", icon: Settings, perm: "org:update" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  return (
    <aside className="w-64 bg-[#141518] border-r border-[#26282E] flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-[#26282E]">
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image src="/brand/icon.png" alt="Orbítica Icon" fill className="object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white tracking-wider">ORBÍTICA POS</span>
          <span className="text-[10px] text-[#0EA5FF] uppercase font-mono tracking-widest">
            {user?.role === "superadmin" ? "SUPERADMIN" : user?.organization_name || "STUDIO"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          if (item.perm && !hasPermission(item.perm)) return null;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group",
                isActive
                  ? "bg-[#0EA5FF]/10 text-[#0EA5FF] font-semibold border border-[#0EA5FF]/20"
                  : "text-[#CFCFD4] hover:bg-[#1A1B1F] hover:text-white",
                item.highlight && !isActive && "text-[#0EA5FF] hover:bg-[#0EA5FF]/5"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-[#0EA5FF]" : "text-[#8E929E] group-hover:text-white",
                  item.highlight && !isActive && "text-[#0EA5FF]"
                )}
              />
              <span className="flex-1 truncate">{item.name}</span>
              {item.highlight && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0EA5FF] text-white font-bold uppercase tracking-wider">
                  F2
                </span>
              )}
            </Link>
          );
        })}

        {user?.role === "superadmin" && (
          <div className="pt-4 mt-4 border-t border-[#26282E]">
            <span className="px-3 text-[10px] uppercase font-bold text-[#6C707E] tracking-wider">
              Plataforma
            </span>
            <Link
              href="/superadmin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-xs font-medium transition-all",
                pathname === "/superadmin"
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "text-[#CFCFD4] hover:bg-[#1A1B1F] hover:text-white"
              )}
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Superadmin Orbítica</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#26282E] bg-[#101114]">
        <div className="flex items-center justify-between text-[11px] text-[#6C707E]">
          <span>Orbítica POS v1.0</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>
    </aside>
  );
}
