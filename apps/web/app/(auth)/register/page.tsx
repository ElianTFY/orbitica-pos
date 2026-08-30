"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center p-4 selection:bg-[#0EA5FF] selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-[#0EA5FF]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-6 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative w-64 h-20 mx-auto flex items-center justify-center">
            <Image
              src="/brand/top_logo.png"
              alt="Orbítica POS"
              fill
              className="object-contain drop-shadow-[0_0_25px_rgba(14,165,255,0.2)]"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Aprovisionar Negocio en <span className="text-[#0EA5FF]">ORBÍTICA POS</span>
          </h1>
          <p className="text-xs text-[#8E929E] max-w-md">
            Comienza tu prueba gratuita de 14 días con Punto de Venta, Inventario y Facturación Electrónica de Costa Rica.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#141518] border border-[#26282E] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-sm">
          {success ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-white">¡Negocio Registrado Exitosamente!</h2>
              <p className="text-xs text-[#8E929E]">
                Tu organización, sucursal inicial y tarifas de IVA de Costa Rica han sido aprovisionadas. Redirigiendo al login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Business info */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#8E929E] tracking-wider block">
                  1. Datos de la Empresa (Costa Rica)
                </span>

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
                    <label className="text-xs font-semibold text-[#CFCFD4]">Tipo de Cédula</label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]"
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
              </div>

              {/* Section 2: Owner User Account */}
              <div className="space-y-3 pt-3 border-t border-[#26282E]">
                <span className="text-[10px] uppercase font-bold text-[#8E929E] tracking-wider block">
                  2. Cuenta del Administrador / Propietario
                </span>

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
                  />
                  <Input
                    label="Contraseña Segura"
                    type="password"
                    placeholder="••••••••"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Perks */}
              <div className="p-3 bg-[#1A1B1F] border border-[#26282E] rounded-xl flex items-center justify-between text-[11px] text-[#8E929E]">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" /> 14 Días de Prueba Gratis
                </span>
                <span>Sin tarjeta de crédito requerida</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider bg-[#0EA5FF] hover:bg-[#0284C7] text-white"
              >
                {isLoading ? "Aprovisionando Negocio..." : "Crear mi Negocio y Comenzar"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-[#26282E]">
            <p className="text-xs text-[#8E929E]">
              ¿Ya tienes una cuenta registrada?{" "}
              <Link href="/login" className="text-[#0EA5FF] font-semibold hover:underline">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#6C707E]">
          ORBÍTICA POS © 2026 • Una plataforma de ORBÍTICA STUDIO • Costa Rica
        </p>
      </div>
    </div>
  );
}