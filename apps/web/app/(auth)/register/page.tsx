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
import { api } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [idType, setIdType] = useState<"JURIDICA" | "FISICA" | "DIMEX">("JURIDICA");
  const [idNumber, setIdNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [branchName, setBranchName] = useState("Sucursal Central");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.request("/organizations/register", {
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
          initial_branch_name: branchName,
          initial_branch_address: "San José, Costa Rica",
          owner_email: ownerEmail,
          owner_password: ownerPassword,
          owner_full_name: ownerName,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al registrar el negocio. Verifique los datos.");
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

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-6 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo size="xl" showSubtitle={true} />
          <h1 className="text-xl font-bold text-text-main tracking-tight mt-2">
            Aprovisionar Negocio en <span className="text-primary">ORBÍTICA POS</span>
          </h1>
          <p className="text-xs text-text-muted max-w-md">
            Comienza tu prueba gratuita de 14 días con Punto de Venta, Inventario y Facturación Electrónica de Costa Rica.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card space-y-6 backdrop-blur-sm transition-colors">
          {success ? (
            <div className="py-12 text-center space-y-4" role="status" aria-live="polite">
              <div className="w-16 h-16 bg-semantic-success-bg border border-semantic-success-border rounded-full flex items-center justify-center mx-auto text-semantic-success-text">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-text-main">¡Negocio Registrado Exitosamente!</h2>
              <p className="text-xs text-text-muted">
                Tu organización, sucursal inicial y tarifas de IVA de Costa Rica han sido aprovisionadas. Redirigiendo al login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="p-3.5 bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl flex items-center gap-2 text-xs text-semantic-danger-text">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Business info */}
              <fieldset className="space-y-3">
                <legend className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-2">
                  1. Datos de la Empresa (Costa Rica)
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nombre Comercial / Fantasía"
                    placeholder="Ej: Pulpería El Carmen"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    required
                    autoFocus
                  />
                  <Input
                    label="Razón Social Legal"
                    placeholder="Ej: Comercial El Carmen S.A."
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
                      <option value="JURIDICA">Persona Jurídica (10 dígitos)</option>
                      <option value="FISICA">Persona Física (9 dígitos)</option>
                      <option value="DIMEX">DIMEX (11-12 dígitos)</option>
                    </select>
                  </div>
                  <Input
                    label="Número de Cédula (sin guiones)"
                    placeholder="3101888999"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Teléfono de Contacto"
                    placeholder="2222-3344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Nombre de Sucursal Inicial"
                    placeholder="Sucursal Central"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Section 2: Owner User Account */}
              <fieldset className="space-y-3 pt-3 border-t border-border">
                <legend className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-2">
                  2. Cuenta del Administrador / Propietario
                </legend>

                <Input
                  label="Nombre Completo del Propietario"
                  placeholder="Ej: Juan Pérez Morales"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Correo Electrónico (Login)"
                    type="email"
                    placeholder="admin@minegocio.cr"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Input
                    label="Contraseña Segura"
                    type="password"
                    placeholder="••••••••"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </fieldset>

              {/* Perks */}
              <div className="p-3 bg-surface-secondary border border-border rounded-xl flex items-center justify-between text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <ShieldCheck className="w-4 h-4" /> 14 Días de Prueba Gratis
                </span>
                <span>Sin tarjeta de crédito requerida</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                className="w-full py-3.5 text-xs font-bold uppercase tracking-wider"
              >
                {isLoading ? "Aprovisionando Negocio..." : "Crear mi Negocio y Comenzar"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-text-muted">
              ¿Ya tienes una cuenta registrada?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline focus-visible:ring-2 focus-visible:ring-primary rounded px-1">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-text-muted">
          ORBÍTICA POS © 2026 • Una plataforma de ORBÍTICA STUDIO • Costa Rica
        </p>
      </div>
    </div>
  );
}