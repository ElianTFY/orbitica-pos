"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/lib/api-client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || code.trim().length !== 6) {
      setError("Ingresa un correo válido y el código de 6 dígitos numéricos.");
      return;
    }

    setIsLoading(true);
    try {
      await api.request("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Error al verificar el código.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-surface-secondary/50">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-black text-text-main tracking-tight">
          Activación de Cuenta
        </h1>
        <p className="mt-1 text-center text-xs text-text-muted">
          Verifica tu correo para activar tu acceso a Orbítica POS
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-xl border border-border sm:rounded-3xl sm:px-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-base font-black text-text-main">¡Correo Verificado con Éxito!</h2>
              <p className="text-xs text-text-muted">
                Tu cuenta está activa. Redirigiendo a inicio de sesión...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Correo Electrónico Registrado *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="admin@negocio.cr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Código de Verificación (6 dígitos) *
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl font-black font-mono tracking-widest py-3"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full font-bold py-2.5 text-xs gap-2"
                disabled={isLoading}
              >
                Verificar y Activar Cuenta
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-xs text-text-muted">
              ¿No recibiste el correo?{" "}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Volver a registrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
