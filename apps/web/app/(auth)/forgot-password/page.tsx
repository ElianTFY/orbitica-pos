"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico registrado.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.request<any>("/auth/recovery", {
        method: "POST",
        body: JSON.stringify({ action: "request_reset", email: email.trim().toLowerCase() }),
      });
      if (res.data?.token) {
        setToken(res.data.token);
      }
      setStep(2);
    } catch (err: any) {
      setError(err?.message || "Error al solicitar recuperación.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      await api.request("/auth/recovery", {
        method: "POST",
        body: JSON.stringify({
          action: "reset_password",
          token: token.trim(),
          new_password: newPassword,
        }),
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Error al restablecer la contraseña.");
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
          Recuperar Contraseña
        </h1>
        <p className="mt-1 text-center text-xs text-text-muted">
          Restablece tu acceso seguro a Orbítica POS
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
              <h2 className="text-base font-black text-text-main">¡Contraseña Actualizada!</h2>
              <p className="text-xs text-text-muted">
                Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.
              </p>
              <Link href="/login">
                <Button variant="primary" className="mt-4 w-full font-bold text-xs">
                  Ir al Inicio de Sesión
                </Button>
              </Link>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Correo Electrónico Registrado *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    type="email"
                    required
                    placeholder="admin@negocio.cr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full font-bold py-2.5 text-xs gap-2"
                disabled={isLoading}
              >
                Enviar Enlace de Recuperación
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Token de Seguridad / Enlace *
                </label>
                <Input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="Token de recuperación"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Nueva Contraseña Segura *
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Repite tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-xs"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full font-bold py-2.5 text-xs gap-2 bg-emerald-600 hover:bg-emerald-500"
                disabled={isLoading}
              >
                Restablecer Contraseña
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-border text-center">
            <Link href="/login" className="text-xs text-primary font-bold hover:underline">
              Volver al Inicio de Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
