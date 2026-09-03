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
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  // Step indicator: 1 = Email, 2 = Verify Code, 3 = Account & Business Info
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Email
  const [email, setEmail] = useState("");
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);

  // Step 2: Verification Code (STARTS COMPLETELY BLANK, NEVER PREFILLED)
  const [verificationCode, setVerificationCode] = useState("");
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: Owner Account & Business
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tradeName, setTradeName] = useState("");
  const [enable2FA, setEnable2FA] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

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

  // Step 1: Request verification code via real backend
  const handleStartRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailAlreadyRegistered(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    try {
      await api.request<{ email: string; expires_in: number }>("/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail }),
      });
      // Blank out code input
      setVerificationCode("");
      setCurrentStep(2);
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err?.code === "EMAIL_ALREADY_REGISTERED" || err?.status === 409) {
        setEmailAlreadyRegistered(true);
        setError("Este correo electrónico ya se encuentra registrado.");
      } else {
        setError(err?.message || "No se pudo enviar el código de verificación.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Validate 6-digit verification code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      setError("Ingresa el código de 6 dígitos que recibiste por correo.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.request<{ verified: boolean; registration_token: string }>("/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
        }),
      });

      if (res.data?.registration_token) {
        setRegistrationToken(res.data.registration_token);
        setCurrentStep(3);
      } else {
        setError("No se pudo verificar el código. Inténtalo de nuevo.");
      }
    } catch (err: any) {
      setError(err?.message || "Código de verificación incorrecto o expirado.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete registration in PostgreSQL database
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !password || !confirmPassword) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!acceptTerms) {
      setError("Debes aceptar los Términos de Servicio y la Política de Privacidad.");
      return;
    }

    setIsLoading(true);
    try {
      const cleanTrade = tradeName.trim() || `Negocio de ${fullName.trim().split(" ")[0]}`;
      const res = await api.request<{ access_token: string; id: string }>("/organizations/register", {
        method: "POST",
        body: JSON.stringify({
          owner_full_name: fullName.trim(),
          owner_email: email.trim().toLowerCase(),
          owner_password: password,
          owner_phone: phone.trim() || undefined,
          enable_2fa: enable2FA,
          registration_token: registrationToken || undefined,
          trade_name: cleanTrade,
          country_code: "CR",
          default_currency: "CRC",
        }),
      });

      if (res.data?.access_token) {
        api.setToken(res.data.access_token);
        await refreshProfile();
        router.push("/onboarding");
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setError(err?.message || "Error al crear la cuenta. Inténtalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Top Bar with Accessible Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Ambient background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <BrandLogo size="xl" showSubtitle={true} />
          <p className="text-[11px] text-text-muted tracking-widest uppercase font-mono font-medium">
            Registro Oficial de Comercio • Costa Rica
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-7 sm:p-8 shadow-card space-y-6 backdrop-blur-sm transition-colors">
          {/* Header with Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-text-main tracking-tight">
                {currentStep === 1 && "Verifica tu Correo"}
                {currentStep === 2 && "Código de Verificación"}
                {currentStep === 3 && "Crea tu Cuenta"}
              </h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Paso {currentStep} de 3
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {currentStep === 1 && "Comencemos verificando la dirección de correo electrónico del titular."}
              {currentStep === 2 && `Hemos enviado un código de 6 dígitos a ${email}.`}
              {currentStep === 3 && "Establece tus credenciales de acceso y el nombre de tu comercio."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl text-xs text-semantic-danger-text font-medium animate-in fade-in duration-150 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {emailAlreadyRegistered && (
                  <Link href="/login" className="font-bold underline text-primary block mt-1">
                    Iniciar sesión para agregar otro negocio →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* STEP 1: EMAIL INPUT */}
          {currentStep === 1 && (
            <form onSubmit={handleStartRegistration} className="space-y-4">
              <Input
                id="reg-email"
                label="Correo Electrónico del Titular *"
                type="email"
                placeholder="propietario@empresa.cr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />

              <p className="text-[11px] text-text-muted">
                Te enviaremos un código de seguridad para confirmar que eres el dueño del correo.
              </p>

              <Button type="submit" variant="primary" className="w-full py-3 font-bold text-sm" disabled={isLoading}>
                {isLoading ? "Validando correo..." : (
                  <>
                    Continuar y Enviar Código
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* STEP 2: VERIFICATION CODE INPUT (COMPLETELY BLANK) */}
          {currentStep === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between text-xs">
                <span className="text-text-muted truncate">Enviado a: <strong className="text-text-main">{email}</strong></span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-primary hover:underline text-[11px] font-semibold shrink-0 ml-2"
                >
                  Cambiar
                </button>
              </div>

              <Input
                id="reg-code"
                label="Código de Verificación (6 dígitos) *"
                type="text"
                placeholder="••••••"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                autoComplete="one-time-code"
                className="text-center font-mono tracking-widest text-lg"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleStartRegistration}
                  className="text-[11px] text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline font-medium"
                >
                  {resendCooldown > 0 ? `Reenviar código en ${resendCooldown}s` : "¿No recibiste el código? Reenviar"}
                </button>
              </div>

              <Button type="submit" variant="primary" className="w-full py-3 font-bold text-sm" disabled={isLoading}>
                {isLoading ? "Verificando código..." : (
                  <>
                    Verificar y Continuar
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* STEP 3: ACCOUNT & BUSINESS SETUP */}
          {currentStep === 3 && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div className="space-y-3 pb-2 border-b border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Datos del Propietario (Acceso Personal)
                </span>

                <Input
                  id="reg-full-name"
                  label="Nombre Completo del Propietario *"
                  type="text"
                  placeholder="Ej: Carlos Murillo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                />

                <Input
                  id="reg-phone"
                  label="Teléfono Personal (Opcional)"
                  type="tel"
                  placeholder="+506 8888-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />

                <div className="relative">
                  <Input
                    id="reg-password"
                    label="Contraseña de Acceso *"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-text-muted hover:text-text-main p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-text-muted">Seguridad de contraseña:</span>
                      <span className="font-semibold text-text-main">{strengthLabels[passwordStrength]}</span>
                    </div>
                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            passwordStrength >= step ? strengthColors[passwordStrength] : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  id="reg-confirm-password"
                  label="Confirmar Contraseña *"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                {/* 2FA Option */}
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enable2FA}
                    onChange={(e) => setEnable2FA(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs text-text-muted">
                    <strong className="text-text-main">Activar verificación en dos pasos (2FA)</strong>. Cada vez que inicies sesión se enviará un código de seguridad a tu correo.
                  </span>
                </label>
              </div>

              {/* Business Name (Optional, remaining business legal details collected in Onboarding) */}
              <div className="space-y-3 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Nombre de tu Comercio
                </span>

                <Input
                  id="reg-trade-name"
                  label="Nombre Comercial del Negocio"
                  type="text"
                  placeholder="Ej: Minisuper El Sol, Panadería Don Carlos..."
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  autoComplete="organization"
                />
                <p className="text-[10px] text-text-muted">
                  Los datos legales, cédula jurídica y configuración fiscal de Hacienda los completarás en el asistente de bienvenida.
                </p>
              </div>

              {/* Terms Acceptance */}
              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                    required
                  />
                  <span className="text-[11px] text-text-muted leading-tight">
                    Acepto los{" "}
                    <Link href="/terms" target="_blank" className="text-primary underline font-medium">
                      Términos de Servicio
                    </Link>{" "}
                    y la{" "}
                    <Link href="/privacy" target="_blank" className="text-primary underline font-medium">
                      Política de Privacidad
                    </Link>{" "}
                    conforme a la legislación de Costa Rica.
                  </span>
                </label>
              </div>

              <Button type="submit" variant="primary" className="w-full py-3 font-bold text-sm" disabled={isLoading}>
                {isLoading ? "Creando tu negocio..." : (
                  <>
                    Crear Cuenta y Configurar Negocio
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Already have an account */}
          <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between text-xs transition-colors">
            <span className="text-text-muted">¿Ya tienes cuenta?</span>
            <Link href="/login" className="text-primary font-bold hover:underline">
              Iniciar Sesión
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-text-muted">
          ORBÍTICA STUDIO &copy; {new Date().getFullYear()} • San José, Costa Rica
        </p>
      </div>
    </div>
  );
}