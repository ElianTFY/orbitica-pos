"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Topbar } from "@/components/layouts/topbar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { useAuth } from "@/features/auth/auth-context";

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Cargando sistema">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-secondary font-mono tracking-wider">CARGANDO ORBÍTICA POS...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col transition-colors">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <Topbar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      {/* Main Content Area with accessible landmark */}
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full pl-0 lg:pl-64 pt-16 pb-20 lg:pb-6 min-h-screen p-3 sm:p-4 md:p-6 overflow-y-auto focus:outline-none"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile Devices */}
      <MobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}