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
  UserCog,
  X,
  FileCheck2,
  Wrench,
  Navigation,
  Landmark,
  CreditCard,
  Tag,
  UploadCloud,
  LifeBuoy,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";
import { BrandIcon } from "@/components/ui/brand-logo";

interface NavGroup {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    perm?: string;
    highlight?: boolean;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "OPERACIONES",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "org:read" },
      { name: "Punto de Venta POS", href: "/pos", icon: ShoppingCart, perm: "pos:read", highlight: true, badge: "F2" },
      { name: "Ventas & Historial", href: "/sales", icon: Receipt, perm: "pos:read" },
      { name: "Cotizaciones / Proformas", href: "/quotes", icon: FileText, perm: "pos:read" },
      { name: "Caja y Turnos Z", href: "/cash-register", icon: DollarSign, perm: "cash:open" },
    ],
  },
  {
    title: "CATÁLOGO E INVENTARIO",
    items: [
      { name: "Productos & Servicios", href: "/products", icon: Package, perm: "catalog:read" },
      { name: "Inventario & Kárdex", href: "/inventory", icon: Boxes, perm: "inventory:read" },
      { name: "Compras a Proveedores", href: "/purchases", icon: PackagePlus, perm: "inventory:adjust" },
      { name: "Directorio Proveedores", href: "/suppliers", icon: Truck, perm: "inventory:read" },
      { name: "Migración & Excel", href: "/migration", icon: UploadCloud, perm: "catalog:read" },
    ],
  },
  {
    title: "COMERCIAL & CRM",
    items: [
      { name: "Clientes & Crédito", href: "/customers", icon: Users, perm: "pos:read" },
      { name: "Fidelidad & Cupones", href: "/loyalty", icon: Tag, perm: "pos:read" },
      { name: "Citas & Órdenes Servicio", href: "/work-orders", icon: Wrench, perm: "pos:read" },
      { name: "Despachos & Rutas", href: "/dispatch", icon: Navigation, perm: "pos:read" },
    ],
  },
  {
    title: "FINANZAS & TRIBUTARIO",
    items: [
      { name: "Facturación Hacienda v4.4", href: "/invoices", icon: FileCheck2, perm: "invoicing:read" },
      { name: "Gastos & Cuentas x Pagar", href: "/expenses", icon: TrendingDown, perm: "reports:read" },
      { name: "Bancos & Conciliación", href: "/banking", icon: Landmark, perm: "reports:read" },
      { name: "Reportes & Resumen D-104", href: "/reports", icon: BarChart3, perm: "reports:read" },
    ],
  },
  {
    title: "ADMINISTRACIÓN",
    items: [
      { name: "Asistente Onboarding", href: "/onboarding", icon: Sparkles, perm: "org:read" },
      { name: "Soporte & Ayuda", href: "/support", icon: LifeBuoy, perm: "org:read" },
      { name: "Empleados & Roles", href: "/employees", icon: UserCog, perm: "org:read" },
      { name: "Sucursales & Cajas", href: "/branches", icon: Building, perm: "branch:read" },
      { name: "Auditoría de Seguridad", href: "/audit", icon: ShieldCheck, perm: "audit:read" },
      { name: "Planes & Suscripción", href: "/subscription", icon: CreditCard, perm: "org:read" },
      { name: "Configuración General", href: "/settings", icon: Settings, perm: "org:update" },
    ],
  },
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
        aria-label="Barra lateral principal"
        className={cn(
          "w-64 bg-surface border-r border-border flex flex-col h-[100dvh] fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex-shrink-0 px-4 flex items-center justify-between border-b border-border bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <BrandIcon size={32} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-text-main tracking-wider truncate">ORBÍTICA</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary-subtle text-primary border border-primary/40 flex-shrink-0">
                  POS
                </span>
              </div>
              <span className="text-[9px] text-text-muted font-medium uppercase font-mono tracking-wider truncate">
                {user?.role === "superadmin" ? "SUPERADMIN PLATFORM" : user?.organization_name || "STUDIO"}
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar menú lateral"
              className="lg:hidden flex-shrink-0 p-1.5 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List — scrollable */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0"
          aria-label="Menú de navegación del sistema"
        >
          {NAV_GROUPS.map((group, gIdx) => {
            const visibleItems = group.items.filter((it) => !it.perm || hasPermission(it.perm));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-text-muted/80">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose && onClose()}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group focus-visible:ring-2 focus-visible:ring-primary",
                          isActive
                            ? "bg-primary text-white shadow-sm shadow-primary/25 font-bold"
                            : "text-text-secondary hover:text-text-main hover:bg-surface-secondary",
                          item.highlight && !isActive && "text-primary bg-primary-subtle/80 border border-primary/30"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 flex-shrink-0 transition-colors",
                            isActive ? "text-white" : item.highlight ? "text-primary" : "text-text-muted group-hover:text-text-main"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0",
                              isActive
                                ? "bg-white/20 text-white"
                                : item.highlight
                                ? "bg-primary/20 text-primary"
                                : "bg-surface-secondary text-text-muted"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom User Profile */}
        <div className="flex-shrink-0 p-3 border-t border-border bg-surface-secondary/50">
          <div className="flex items-center gap-3 px-2 py-1.5 min-w-0">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-xs text-primary shadow-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text-main truncate">{user?.full_name || "Usuario"}</span>
              <span className="text-[10px] text-text-muted capitalize truncate">{user?.role || "cajero"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}