"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Topbar } from "@/components/layouts/topbar";
import { useAuth } from "@/features/auth/auth-context";

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0EA5FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#CFCFD4] font-mono tracking-wider">CARGANDO ORBÍTICA POS...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E6EA]">
      <Sidebar />
      <Topbar />
      <main className="pl-64 pt-16 min-h-screen p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
