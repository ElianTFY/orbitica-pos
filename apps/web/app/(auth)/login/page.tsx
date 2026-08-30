"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, Mail, ArrowRight, ShieldCheck, Store, UserCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-[#0EA5FF] selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#0EA5FF]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="relative w-64 h-20 mx-auto flex items-center justify-center">
            <Image
              src="/brand/top_logo.png"
              alt="Orbítica POS"
              fill
              className="object-contain drop-shadow-[0_0_25px_rgba(14,165,255,0.2)]"
              priority
            />
          </div>
          <p className="text-[11px] text-[#8E929E] tracking-widest uppercase font-mono font-medium">
            Plataforma SaaS Punto de Venta • Costa Rica
          </p>
        </div>

        <div className="bg-[#141518] border border-[#26282E] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6 backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">Iniciar Sesión</h2>
            <p className="text-xs text-[#8E929E]">Ingresa con tus credenciales de Orbítica POS</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium animate-in fade-in duration-150">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu@negocio.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full py-2.5 font-semibold" disabled={isSubmitting}>
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
          <div className="p-3 bg-[#1A1B1F] border border-[#26282E] rounded-xl flex items-center justify-between text-xs">
            <span className="text-[#8E929E]">¿Tienes un negocio nuevo?</span>
            <Link href="/register" className="text-[#0EA5FF] font-semibold hover:underline flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Registrar Negocio
            </Link>
          </div>

          <div className="pt-4 border-t border-[#26282E] space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#6C707E] tracking-wider block">
              Accesos Rápidos de Prueba:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("owner@sanjoseexpress.cr", "OwnerPassword123!")}
                className="flex items-center gap-1.5 p-2 bg-[#1A1B1F] hover:bg-[#222328] border border-[#26282E] rounded-lg text-[11px] text-[#CFCFD4] hover:text-white transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-[#0EA5FF]" />
                <span>Owner Demo</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("cajero@sanjoseexpress.cr", "CashierPassword123!")}
                className="flex items-center gap-1.5 p-2 bg-[#1A1B1F] hover:bg-[#222328] border border-[#26282E] rounded-lg text-[11px] text-[#CFCFD4] hover:text-white transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cajero Demo</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("superadmin@orbitica.cr", "SuperSecret123!")}
                className="col-span-2 flex items-center justify-center gap-1.5 p-2 bg-[#1A1B1F] hover:bg-[#222328] border border-[#26282E] rounded-lg text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Superadmin Orbítica Studio</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#6C707E]">
          ORBÍTICA STUDIO &copy; {new Date().getFullYear()} • San José, Costa Rica
        </p>
      </div>
    </div>
  );
}