"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Topbar } from "@/components/layouts/topbar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { useAuth } from "@/features/auth/auth-context";

function LoadingScreen() {
  return (
    <div
      className="min-h-[100dvh] bg-background flex items-center justify-center"
      role="status"
      aria-label="Cargando sistema"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-text-secondary font-mono tracking-wider">
          CARGANDO ORBÍTICA POS...
        </span>
      </div>
    </div>
  );
}

/** Standard layout with max-width centering — used by all pages except /pos */
export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <div className="bg-background text-text-main transition-colors">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <Topbar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      <main
        id="main-content"
        tabIndex={-1}
        className="lg:pl-64 pt-16 pb-20 lg:pb-8 min-h-[100dvh] focus:outline-none"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6">
          {children}
        </div>
      </main>

      <MobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}

/**
 * Full-viewport layout for the POS page.
 * Does NOT apply max-width or centering — the POS manages its own internal scroll.
 * Content area fills exactly the space between the topbar (h-16) and bottom nav.
 */
export function POSLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <div className="bg-background text-text-main transition-colors overflow-hidden h-[100dvh]">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <Topbar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      {/* POS content area: fills exactly topbar-bottom to viewport bottom */}
      <div
        id="main-content"
        className="lg:pl-64 pt-16 h-[100dvh] flex flex-col overflow-hidden focus:outline-none"
      >
        {/* The inner area below topbar — POS controls its own scroll */}
        <div className="flex-1 overflow-hidden min-h-0">
          {children}
        </div>
        {/* Mobile bottom nav spacer (on mobile the nav is fixed so we need padding) */}
        <div className="h-0 lg:hidden" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      <MobileNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}