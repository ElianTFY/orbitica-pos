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
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#141518]/95 backdrop-blur-md border-t border-[#26282E] lg:hidden px-2 py-1.5 flex items-center justify-around">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all",
              isActive
                ? "text-[#0EA5FF] font-bold"
                : "text-[#8E929E] hover:text-white"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg transition-transform",
                link.highlight && !isActive && "bg-[#0EA5FF]/10 text-[#0EA5FF]",
                isActive && "scale-110"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{link.name}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[#8E929E] hover:text-white transition-colors"
      >
        <div className="p-1">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Menú</span>
      </button>
    </nav>
  );
}