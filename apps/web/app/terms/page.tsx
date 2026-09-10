import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, FileText, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function TermsPage() {
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
            <span className="text-xs font-black text-primary uppercase tracking-wider">Marco Jurídico y Comercial</span>
            <h1 className="text-3xl font-black tracking-tight mt-1">Términos y Condiciones de Servicio</h1>
            <p className="text-xs text-text-muted mt-2">
              Última actualización: 1 de Septiembre de 2026 · Versión 1.0 · República de Costa Rica
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> 1. Aceptación del Servicio
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              El presente contrato regula el acceso y uso de la plataforma de software como servicio (SaaS) **Orbítica POS**, desarrollada y operada para el comercio minorista y empresarial en Costa Rica. Al registrar una cuenta u operar la plataforma, la persona física o jurídica (el &ldquo;Suscriptor&rdquo;) acepta íntegramente las presentes condiciones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> 2. Propiedad de Datos y Aislamiento Multiempresa
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              El Suscriptor es el único y exclusivo propietario de los datos de inventario, ventas, clientes, proveedores y registros de facturación almacenados en su cuenta. Orbítica garantiza mediante segregación criptográfica y de base de datos el aislamiento estricto de la información de cada empresa registrada. En ningún caso Orbítica comercializará ni transferirá datos comerciales de sus clientes a terceros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> 3. Responsabilidad Tributaria y Facturación Electrónica
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Orbítica POS proporciona herramientas de emisión fiscal compatibles con los esquemas técnicos vigentes del Ministerio de Hacienda de Costa Rica (DGT). El Suscriptor es el único obligado tributario legal ante la Dirección General de Tributación por la exactitud de sus declaraciones, el uso de sus llaves criptográficas (.p12) y la consistencia de sus tarifas impositivas (IVA).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold">4. Disponibilidad, Seguridad y Respaldos</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Orbítica implementa estándares de alta disponibilidad, cifrado de datos en reposo y en tránsito (TLS 1.3), auditoría inmutable en bases de datos y respaldos automatizados continuos. El servicio se presta con un acuerdo de nivel de servicio (SLA) objetivo del 99.9% de operatividad en infraestructura en la nube.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold">5. Suscripciones y Facturación del Servicio</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Los planes comerciales se facturan según el esquema contratado (mensual o anual) con un período de prueba gratuito de 14 días sin compromiso de permanencia. La falta de pago tras los períodos de gracia informados podrá conllevar la suspensión temporal del acceso a módulos de venta activa, preservando el acceso de consulta a los registros históricos fiscales durante el plazo fijado por ley.
            </p>
          </section>

          <div className="pt-6 border-t border-border flex justify-between items-center text-xs text-text-muted">
            <span>Para dudas legales: <a href="mailto:legal@orbitica.cr" className="text-primary font-bold hover:underline">legal@orbitica.cr</a></span>
            <Link href="/privacy" className="text-primary font-bold hover:underline">
              Ver Política de Privacidad →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
