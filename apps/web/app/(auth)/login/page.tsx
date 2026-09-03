"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, KeyRound, ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("EMAIL");
  const [mfaChallengeNotice, setMfaChallengeNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, verify2FA } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (require2FA && challengeToken) {
        if (!twoFACode || twoFACode.trim().length !== 6) {
          setError("Ingresa el código de 6 dígitos.");
          setIsSubmitting(false);
          return;
        }
        await verify2FA(challengeToken, twoFACode.trim());
        return;
      }

      const result = await login(email, password, requireTotp ? totpCode : undefined);
      if (result && result.requires2FA && result.challengeToken) {
        setRequire2FA(true);
        setChallengeToken(result.challengeToken);
        setDeliveryMethod(result.deliveryMethod || "EMAIL");
        setMfaChallengeNotice(
          result.deliveryMethod === "EMAIL"
            ? `Hemos enviado un código de seguridad de 6 dígitos a ${email}. Ingresa el código para autorizar tu acceso.`
            : "Ingresa el código temporal de tu aplicación autenticadora."
        );
      }
    } catch (err: any) {
      const msg = err?.message || "Credenciales incorrectas o cuenta bloqueada";
      if (
        msg.toLowerCase().includes("totp") ||
        msg.toLowerCase().includes("mfa") ||
        msg.toLowerCase().includes("dos pasos") ||
        msg.includes("MFA_ENROLLMENT_REQUIRED")
      ) {
        setRequireTotp(true);
        if (msg.includes("MFA_ENROLLMENT_REQUIRED")) {
          setMfaChallengeNotice(
            "Tu cuenta requiere verificación de dos factores (TOTP). Ingresa el código de 6 dígitos de tu aplicación autenticadora para completar la activación."
          );
        } else {
          setMfaChallengeNotice("Ingresa el código temporal de 6 dígitos de tu aplicación autenticadora.");
        }
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setRequire2FA(false);
    setChallengeToken(null);
    setTwoFACode("");
    setMfaChallengeNotice(null);
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
            <h1 className="text-xl font-bold text-text-main tracking-tight">
              {require2FA ? "Verificación en Dos Pasos (2FA)" : "Iniciar Sesión"}
            </h1>
            <p className="text-xs text-text-muted">
              {require2FA
                ? "Confirma tu identidad para acceder de manera segura"
                : "Ingresa con tus credenciales de Orbítica POS"}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl text-xs text-semantic-danger-text font-medium animate-in fade-in duration-150"
            >
              {error}
            </div>
          )}

          {mfaChallengeNotice && (
            <div
              role="alert"
              className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary font-medium animate-in fade-in duration-150 flex items-start gap-2"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span>{mfaChallengeNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!require2FA ? (
              <>
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

                {requireTotp && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <Input
                      id="login-totp"
                      label="Código de Seguridad TOTP (6 dígitos)"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                      autoComplete="one-time-code"
                    />
                    <p className="text-[10px] text-text-muted flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-primary" />
                      Google Authenticator, Microsoft Authenticator o Authy
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-text-muted hover:text-primary transition-colors hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center gap-3 text-xs text-text-muted">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Código enviado a: <strong className="text-text-main">{email}</strong></span>
                </div>

                <Input
                  id="login-2fa-code"
                  label="Código de Verificación (6 dígitos)"
                  type="text"
                  placeholder="••••••"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className="text-center font-mono tracking-widest text-lg"
                />

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-[11px] text-text-muted hover:text-primary flex items-center gap-1 hover:underline"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Volver a ingresar correo y contraseña
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full py-3 font-bold text-sm" disabled={isSubmitting}>
              {isSubmitting ? (
                "Validando credenciales..."
              ) : require2FA ? (
                <>
                  Verificar Código y Entrar
                  <ShieldCheck className="w-4 h-4 ml-2" />
                </>
              ) : requireTotp ? (
                <>
                  Verificar y Acceder
                  <ShieldCheck className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Acceder al Sistema
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Self Service Registration Link */}
          {!require2FA && (
            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between text-xs transition-colors">
              <span className="text-text-muted">¿Tienes un negocio nuevo?</span>
              <Link href="/register" className="text-primary font-bold hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1">
                <Sparkles className="w-3.5 h-3.5" />
                Registrar Negocio
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-text-muted">
          ORBÍTICA STUDIO &copy; {new Date().getFullYear()} • San José, Costa Rica
        </p>
      </div>
    </div>
  );
}