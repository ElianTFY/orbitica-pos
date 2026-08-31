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

  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [idType, setIdType] = useState<"JURIDICA" | "FISICA" | "DIMEX">("JURIDICA");
  const [idNumber, setIdNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [branchName, setBranchName] = useState("Sucursal Central (001)");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.request<any>("/organizations/register", {
        method: "POST",
        body: JSON.stringify({
          legal_name: legalName,
          trade_name: tradeName || legalName,
          identification_type: idType,
          identification_number: idNumber,
          email: ownerEmail,
          phone: phone || "+506 2200-0000",
          country_code: "CR",
          default_currency: "CRC",
          initial_branch_name: branchName || "Sucursal Central (001)",
          initial_branch_address: "San José, Costa Rica",
          owner_email: ownerEmail,
          owner_password: ownerPassword,
          owner_full_name: ownerName,
        }),
      });

      if (res.data?.access_token) {
        api.setToken(res.data.access_token);
      }

      setSuccess(true);
      setTimeout(async () => {
        try {
          await login(ownerEmail, ownerPassword);
        } catch {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al registrar el negocio. Verifique los datos.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors">
      {/* Top Bar Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-6 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <BrandLogo size="xl" showSubtitle={true} />
          <p className="text-[11px] text-text-muted tracking-widest uppercase font-mono font-medium">
            Registro Oficial de Negocio • Plataforma Multi-tenant Costa Rica
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card space-y-6 backdrop-blur-sm transition-colors">
          {success ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-semantic-success-bg text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-semantic-success-border shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-text-main">¡Negocio Registrado Exitosamente!</h2>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Tu empresa <strong className="text-primary">{tradeName || legalName}</strong> y sucursal <strong className="text-text-main">{branchName}</strong> han sido creadas con 14 días de prueba y facturación electrónica activada.
                </p>
              </div>
              <p className="text-xs text-text-muted animate-pulse">Entrando a tu panel administrativo...</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Crear Cuenta para tu Negocio
                </h1>
                <p className="text-xs text-text-muted">
                  Comienza tu prueba de 14 días con facturación electrónica Hacienda v4.3 y control de inventario
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl text-xs text-semantic-danger-text font-medium flex items-center gap-2 animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                    1. Datos de la Empresa
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nombre Comercial (Fantasía)"
                      placeholder="Ej: Pulpería El Carmen"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      required
                    />

                    <Input
                      label="Razón Social (Legal)"
                      placeholder="Ej: Inversiones El Carmen S.A."
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                        Tipo de Cédula
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <option value="JURIDICA">Cédula Jurídica (10 dígitos)</option>
                        <option value="FISICA">Cédula Física (9 dígitos)</option>
                        <option value="DIMEX">DIMEX (11-12 dígitos)</option>
                      </select>
                    </div>

                    <Input
                      label="Número de Cédula"
                      placeholder="3101123456"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Teléfono del Negocio"
                      placeholder="+506 2200-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />

                    <Input
                      label="Nombre de Sucursal Inicial"
                      placeholder="Ej: Sucursal Central (001)"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                    2. Cuenta del Administrador / Dueño
                  </span>

                  <Input
                    label="Nombre Completo del Propietario"
                    placeholder="Ej: Carlos Morales Vega"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Correo Electrónico"
                      type="email"
                      placeholder="propietario@minegocio.cr"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />

                    <Input
                      label="Contraseña"
                      type="password"
                      placeholder="••••••••"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center gap-2 text-xs text-text-muted">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Tu cuenta incluye 14 días de prueba gratuita. Sin cobros automáticos.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3.5 font-bold text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Aprovisionando organización..."
                  ) : (
                    <>
                      Crear Mi Negocio en Orbítica POS
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-xs text-text-muted">
                ¿Ya tienes una cuenta registrada?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded px-1">
                  Inicia Sesión aquí
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-text-muted">
          ORBÍTICA STUDIO &copy; {new Date().getFullYear()} • Facturación Electrónica Homologada
        </p>
      </div>
    </div>
  );
}