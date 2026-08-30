"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Building,
  Sparkles,
  Settings,
  ShieldCheck,
  PackagePlus,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";
import { BrandIcon } from "@/components/ui/brand-logo";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "org:read" },
  { name: "Punto de Venta", href: "/pos", icon: ShoppingCart, perm: "pos:read", highlight: true },
  { name: "Ventas", href: "/sales", icon: Receipt, perm: "pos:read" },
  { name: "Productos", href: "/products", icon: Package, perm: "catalog:read" },
  { name: "Inventario", href: "/inventory", icon: Boxes, perm: "inventory:read" },
  { name: "Compras / Stock", href: "/purchases", icon: PackagePlus, perm: "inventory:adjust" },
  { name: "Proveedores", href: "/suppliers", icon: Truck, perm: "inventory:read" },
  { name: "Clientes", href: "/customers", icon: Users, perm: "pos:read" },
  { name: "Caja y Turnos", href: "/cash-register", icon: DollarSign, perm: "cash:open" },
  { name: "Facturación Electrónica", href: "/invoices", icon: FileText, perm: "invoicing:read" },
  { name: "Reportes", href: "/reports", icon: BarChart3, perm: "reports:read" },
  { name: "Auditoría", href: "/audit", icon: ShieldCheck, perm: "audit:read" },
  { name: "Sucursales", href: "/branches", icon: Building, perm: "branch:read" },
  { name: "Suscripción", href: "/subscription", icon: Sparkles, perm: "org:read" },
  { name: "Configuración", href: "/settings", icon: Settings, perm: "org:update" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "w-64 bg-[#141518] border-r border-[#26282E] flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#26282E] bg-[#141518]">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <BrandIcon size={32} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-wider truncate">ORBÍTICA</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#0EA5FF]/20 text-[#0EA5FF] border border-[#0EA5FF]/40">
                  POS
                </span>
              </div>
              <span className="text-[9px] text-[#8E929E] font-medium uppercase font-mono tracking-wider truncate">
                {user?.role === "superadmin" ? "SUPERADMIN PLATFORM" : user?.organization_name || "STUDIO"}
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-[#8E929E] hover:text-white rounded-lg hover:bg-[#1A1B1F] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.perm && !hasPermission(item.perm)) return null;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose && onClose()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                  isActive
                    ? "bg-[#0EA5FF] text-white shadow-[0_0_15px_rgba(14,165,255,0.3)]"
                    : "text-[#8E929E] hover:text-white hover:bg-[#1A1B1F]",
                  item.highlight && !isActive && "text-[#0EA5FF] bg-[#0EA5FF]/10 border border-[#0EA5FF]/20"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-white" : item.highlight ? "text-[#0EA5FF]" : "text-[#8E929E] group-hover:text-white"
                  )}
                />
                <span className="truncate">{item.name}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[9px] font-mono bg-[#0EA5FF]/20 text-[#0EA5FF] px-1.5 py-0.2 rounded font-bold">
                    POS
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Profile */}
        <div className="p-3 border-t border-[#26282E] bg-[#0A0A0A]/50">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-[#1A1B1F] border border-[#26282E] flex items-center justify-center font-bold text-xs text-[#0EA5FF]">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">{user?.full_name || "Usuario"}</span>
              <span className="text-[10px] text-[#8E929E] capitalize truncate">{user?.role || "cajero"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}