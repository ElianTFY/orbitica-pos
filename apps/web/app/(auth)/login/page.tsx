"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Mail, ArrowRight, ShieldCheck, Store, UserCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Credenciales incorrectas o cuenta bloqueada");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Top Bar with Accessible Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <BrandLogo size="xl" showSubtitle={true} />
          <p className="text-[11px] text-text-muted tracking-widest uppercase font-mono font-medium">
            Plataforma SaaS Punto de Venta • Costa Rica
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-7 sm:p-8 shadow-card space-y-6 backdrop-blur-sm transition-colors">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-text-main tracking-tight">Iniciar Sesión</h1>
            <p className="text-xs text-text-muted">Ingresa con tus credenciales de Orbítica POS</p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl text-xs text-semantic-danger-text font-medium animate-in fade-in duration-150"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              label="Correo Electrónico"
              type="email"
              placeholder="tu@negocio.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              id="login-password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button type="submit" variant="primary" className="w-full py-3 font-bold text-sm" disabled={isSubmitting}>
              {isSubmitting ? (
                "Validando credenciales..."
              ) : (
                <>
                  Acceder al Sistema
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Self Service Registration Link */}
          <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between text-xs transition-colors">
            <span className="text-text-muted">¿Tienes un negocio nuevo?</span>
            <Link href="/register" className="text-primary font-bold hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1">
              <Sparkles className="w-3.5 h-3.5" />
              Registrar Negocio
            </Link>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
              Accesos Rápidos de Prueba:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("owner@sanjoseexpress.cr", "OwnerPassword123!")}
                className="flex items-center gap-1.5 p-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-text-secondary hover:text-text-main transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Store className="w-3.5 h-3.5 text-primary" />
                <span>Owner Demo</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("cajero@sanjoseexpress.cr", "CashierPassword123!")}
                className="flex items-center gap-1.5 p-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-text-secondary hover:text-text-main transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cajero Demo</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("superadmin@orbitica.cr", "SuperSecret123!")}
                className="col-span-2 flex items-center justify-center gap-1.5 p-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Superadmin Orbítica Studio</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-text-muted">
          ORBÍTICA STUDIO &copy; {new Date().getFullYear()} • San José, Costa Rica
        </p>
      </div>
    </div>
  );
}