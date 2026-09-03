"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const passwordStrength = getPasswordStrength();
  const strengthLabels = ["Muy Débil", "Débil", "Aceptable", "Fuerte", "Excelente"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Verifica que estén escritas idénticas.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres por seguridad.");
      return;
    }

    if (!acceptTerms) {
      setError("Debes aceptar los Términos de Servicio y la Política de Privacidad para continuar.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanTrade = tradeName.trim() || `Empresa de ${fullName.trim().split(" ")[0]}`;
      const res = await api.request<any>("/organizations/register", {
        method: "POST",
        body: JSON.stringify({
          legal_name: cleanTrade,
          trade_name: cleanTrade,
          identification_type: "JURIDICA",
          identification_number: "3101000000",
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          owner_email: email.trim().toLowerCase(),
          owner_password: password,
          owner_full_name: fullName.trim(),
          enable_2fa: enable2FA,
        }),
      });

      if (res.data?.access_token) {
        api.setToken(res.data.access_token);
      }

      await login(email.trim().toLowerCase(), password);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err?.message || "Error al completar el registro. Intenta nuevamente.");
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
          Crea tu cuenta en Orbítica POS
        </h1>
        <p className="mt-1 text-center text-xs text-text-muted">
          14 días de prueba gratis con plan <strong>Crece</strong> · Sin tarjeta de crédito
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

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Nombre y Apellidos del Propietario *
              </label>
              <div className="relative">
                <Input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez Soto"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9 text-xs"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Trade Name */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Nombre Comercial de la Empresa / Tienda
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ej. Supermercado El Ahorro"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="pl-9 text-xs"
                />
                <Building2 className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Correo Electrónico Comercial *
              </label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  placeholder="juan@elahorro.cr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                />
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Teléfono / WhatsApp *
              </label>
              <div className="relative">
                <Input
                  type="tel"
                  required
                  placeholder="+506 8888-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 text-xs"
                />
                <Phone className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Contraseña Maestra (mínimo 8 caracteres) *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 text-xs"
                />
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-all ${
                          passwordStrength >= level
                            ? strengthColors[passwordStrength]
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted">
                    Seguridad:{" "}
                    <span className="font-bold">
                      {strengthLabels[passwordStrength]}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 text-xs"
                />
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2FA Option */}
            <div className="p-3 bg-surface-secondary/50 border border-border rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-xs font-bold text-text-main leading-none">
                    Doble Factor (2FA / MFA)
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Mayor seguridad para transacciones y cortes de caja
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enable2FA}
                onChange={(e) => setEnable2FA(e.target.checked)}
                className="w-4 h-4 text-primary rounded cursor-pointer"
              />
            </div>

            {/* Terms & Privacy */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                required
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-primary rounded cursor-pointer"
              />
              <label htmlFor="terms" className="text-[11px] text-text-muted leading-tight cursor-pointer">
                Acepto los{" "}
                <Link href="/terms" target="_blank" className="text-primary font-bold hover:underline">
                  Términos de Servicio
                </Link>{" "}
                y la{" "}
                <Link href="/privacy" target="_blank" className="text-primary font-bold hover:underline">
                  Política de Privacidad
                </Link>{" "}
                de Orbítica POS Costa Rica.
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              className="w-full font-bold py-2.5 text-xs gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creando tu Cuenta...
                </>
              ) : (
                <>
                  Crear Cuenta Comercial
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-xs text-text-muted">
              ¿Ya tienes una cuenta registrada?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}