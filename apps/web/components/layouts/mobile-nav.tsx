"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  FileText,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onOpenMenu: () => void;
}

export function MobileNav({ onOpenMenu }: MobileNavProps) {
  const pathname = usePathname();

  const NAV_LINKS = [
    { name: "POS", href: "/pos", icon: ShoppingCart, highlight: true },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stock", href: "/inventory", icon: Boxes },
    { name: "Facturas", href: "/invoices", icon: FileText },
  ];

  return (
    <nav
      aria-label="Barra de navegación móvil"
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border lg:hidden px-2 py-1.5 flex items-center justify-around transition-colors"
    >
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary",
              isActive
                ? "text-primary font-bold"
                : "text-text-muted hover:text-text-main"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg transition-transform",
                link.highlight && !isActive && "bg-primary-subtle text-primary",
                isActive && "scale-110 text-primary"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{link.name}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenMenu}
        aria-label="Abrir menú completo de navegación"
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-text-muted hover:text-text-main transition-colors focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="p-1">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Menú</span>
      </button>
    </nav>
  );
}