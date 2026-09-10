import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Database, EyeOff, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-secondary/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/register" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al Registro
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <BrandLogo size="md" />
          </div>
        </div>

        <div className="bg-surface p-8 sm:p-12 rounded-3xl border border-border shadow-sm space-y-6 text-text-main">
          <div className="border-b border-border pb-6">
            <span className="text-xs font-black text-primary uppercase tracking-wider">Protección de Datos Personales</span>
            <h1 className="text-3xl font-black tracking-tight mt-1">Política de Privacidad</h1>
            <p className="text-xs text-text-muted mt-2">
              Conforme a la Ley N° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales (Costa Rica).
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> 1. Principio de Confidencialidad y Seguridad
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              En **Orbítica POS** tratamos la información de su comercio, colaboradores y clientes con los más altos estándares de seguridad informática. Las contraseñas se almacenan mediante funciones criptográficas irreversibles de última generación (Argon2id), y los certificados de firma digital se custodian cifrados con algoritmos AES-256 / Fernet.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> 2. Datos Recopilados y su Finalidad
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Recopilamos únicamente los datos indispensables para la prestación del servicio: nombre comercial, cédula jurídica o física, información de contacto, registro de transacciones de venta, inventario de productos y credenciales de acceso. Estos datos se utilizan exclusivamente para operar las funciones del POS, emitir comprobantes fiscales y generar los reportes analíticos de su negocio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-primary" /> 3. No Cesión a Terceros
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              No compartimos, vendemos ni alquilamos su información comercial a intermediarios publicitarios ni a otras empresas. La única comunicación externa de datos se realiza hacia la Dirección General de Tributación (Ministerio de Hacienda) cuando usted emite comprobantes fiscales electrónicos autorizados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> 4. Derechos de Acceso, Rectificación y Supresión
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Usted tiene el derecho inalienable de acceder a sus datos, solicitar la rectificación de información errónea o la exportación íntegra de sus catálogos y transacciones. Para ejercer cualquiera de sus derechos, puede contactar a nuestro oficial de privacidad en <a href="mailto:privacidad@orbitica.cr" className="text-primary font-bold hover:underline">privacidad@orbitica.cr</a>.
            </p>
          </section>

          <div className="pt-6 border-t border-border flex justify-between items-center text-xs text-text-muted">
            <span>Oficial de Privacidad: <a href="mailto:privacidad@orbitica.cr" className="text-primary font-bold hover:underline">privacidad@orbitica.cr</a></span>
            <Link href="/terms" className="text-primary font-bold hover:underline">
              Ver Términos y Condiciones →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
