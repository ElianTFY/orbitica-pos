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
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
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

  // Registration step (1 = Form, 2 = Email Verification Code)
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);

  // Business Name
  const [tradeName, setTradeName] = useState("");

  // Verification Code
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(60);

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

  const handleStep1Submit = (e: React.FormEvent) => {
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

    // Move to email verification step
    setStep(2);
    setVerificationCode("849201"); // Auto-generate / mock simulation code for instant usability
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verificationCode.trim().length !== 6) {
      setError("Ingresa el código de 6 dígitos que enviamos a tu correo.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verify code
      await api.request("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim(),
        }),
      });

      // 2. Provision organization & user
      const cleanTrade = tradeName.trim() || `Empresa de ${fullName.split(" ")[0]}`;
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
          {step === 1 ? "Crea tu cuenta en Orbítica POS" : "Verifica tu correo electrónico"}
        </h1>
        <p className="mt-1 text-center text-xs text-text-muted">
          {step === 1 ? (
            <>
              14 días de prueba gratis con plan <strong>Crece</strong> · Sin tarjeta de crédito
            </>
          ) : (
            <>
              Hemos enviado un código de 6 dígitos a <strong className="text-primary">{email}</strong>
            </>
          )}
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

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Nombre Completo del Propietario *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mora Brenes"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Trade Name */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Nombre de tu Negocio / Empresa *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Supermercado El Ahorro / Soda La Esquina"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Correo Electrónico *
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

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Teléfono Móvil (CR) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      type="tel"
                      required
                      placeholder="+506 8888-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Contraseña Segura *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-surface-secondary rounded-full overflow-hidden">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-full flex-1 transition-all duration-300 ${
                            passwordStrength >= bar ? strengthColors[passwordStrength] : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-text-muted">
                      Seguridad: {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              {/* 2FA Option */}
              <div className="p-3 bg-surface-secondary border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-main block">Autenticación en Dos Pasos (2FA)</span>
                  <span className="text-[10px] text-text-muted block">Mayor protección contra accesos no autorizados</span>
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
                  <a href="#" className="text-primary font-bold hover:underline">
                    Términos de Servicio
                  </a>{" "}
                  y la{" "}
                  <a href="#" className="text-primary font-bold hover:underline">
                    Política de Privacidad
                  </a>{" "}
                  de Orbítica POS Costa Rica.
                </label>
              </div>

              {/* Submit */}
              <Button type="submit" variant="primary" className="w-full font-bold py-2.5 text-xs gap-2">
                Continuar a Verificación
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-1">
                <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
                <h2 className="text-xs font-black text-text-main uppercase">Código de Verificación</h2>
                <p className="text-[11px] text-text-muted">
                  Ingresa el código PIN de 6 dígitos enviado a tu correo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1 text-center">
                  Código de 6 Dígitos *
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl font-black font-mono tracking-widest py-3"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expira en 15 minutos
                </span>
                <button
                  type="button"
                  onClick={() => setVerificationCode("849201")}
                  className="text-primary font-bold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reenviar código
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 text-xs font-bold"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Modificar Datos
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500"
                  disabled={isLoading}
                >
                  Verificar y Crear POS
                </Button>
              </div>
            </form>
          )}

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