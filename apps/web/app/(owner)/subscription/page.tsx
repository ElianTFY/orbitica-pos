"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  Building,
  Users,
  Shield,
  Calendar,
  Zap,
  Crown,
  HelpCircle,
  Smartphone,
  CreditCard,
  Building2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";

interface PlanTier {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  limits: {
    branches: string;
    terminals: string;
    invoices: string;
    products: string;
  };
}

const PLANS: PlanTier[] = [
  {
    id: "basic",
    name: "Emprendedor",
    monthlyPrice: 15000,
    annualPrice: 144000, // ₡12,000/mo (20% off)
    description: "Ideal para pulperías, sodas, bazares y pequeños comercios que inician.",
    limits: {
      branches: "1 Sucursal",
      terminals: "1 Caja POS",
      invoices: "Hasta 200 / mes",
      products: "Hasta 500 SKUs",
    },
    features: [
      "Punto de Venta POS rápido y táctil",
      "Facturación Electrónica v4.4 (01 y 04)",
      "Control de Caja y Arqueo Z diario",
      "Impresión de tiquetes térmicos 80mm",
      "Catálogo de productos e inventario",
      "Soporte por Correo Electrónico",
    ],
  },
  {
    id: "pro",
    name: "Profesional",
    popular: true,
    badge: "MÁS POPULAR",
    monthlyPrice: 25000,
    annualPrice: 240000, // ₡20,000/mo (20% off)
    description: "Para restaurantes, tiendas, ferreterías y negocios en pleno crecimiento.",
    limits: {
      branches: "Hasta 2 Sucursales",
      terminals: "Cajas Ilimitadas",
      invoices: "Hacienda Ilimitada",
      products: "Productos Ilimitados",
    },
    features: [
      "Todo lo incluido en Emprendedor",
      "Facturación Hacienda v4.4 ILIMITADA",
      "Múltiples cajas simultáneas en red",
      "Kárdex de inventario y compras a proveedores",
      "Reportes de ventas y utilidad bruta",
      "Resumen tributario para declaración D-104",
      "Directorio ilimitado de clientes y proveedores",
      "Soporte Prioritario por WhatsApp y Email",
    ],
  },
  {
    id: "corporate",
    name: "Corporativo",
    badge: "MULTI-SUCURSAL",
    monthlyPrice: 45000,
    annualPrice: 432000, // ₡36,000/mo (20% off)
    description: "Para cadenas de tiendas, franquicias y distribuidoras comerciales.",
    limits: {
      branches: "Hasta 5 Sucursales",
      terminals: "Cajas Ilimitadas",
      invoices: "Hacienda Ilimitada",
      products: "Ilimitados Multi-Bodega",
    },
    features: [
      "Todo lo incluido en Profesional",
      "Hasta 5 sucursales centralizadas",
      "Gestión de empleados con roles y permisos",
      "Kárdex multi-bodega y traslados de stock",
      "Auditoría de seguridad y trazabilidad total",
      "Asesoría técnica de conexión ATV Hacienda",
      "Gerente de cuenta y Soporte VIP 24/7",
    ],
  },
];

export default function SubscriptionPage() {
  const { settings, products, invoices, updateSettings } = useStore();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [activePlanId, setActivePlanId] = useState<string>("trial");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleSelectPlan = (plan: PlanTier) => {
    setSelectedPlan(plan);
  };

  const handleConfirmPlan = () => {
    if (selectedPlan) {
      setActivePlanId(selectedPlan.id);
      setSelectedPlan(null);
      setIsSuccessModalOpen(true);
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-text-main tracking-tight">Planes y Suscripción</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {settings.trade_name} — Facturación electrónica Hacienda CR v4.4 y punto de venta sin comisiones ocultas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" className="py-1.5 px-3 font-mono text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {activePlanId === "trial" ? "Prueba Gratuita Activa" : `Plan ${PLANS.find(p => p.id === activePlanId)?.name || "Activo"}`}
            </Badge>
          </div>
        </div>

        {/* Current Status Overview Card */}
        <Card className="border-l-4 border-l-primary space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-text-main">
                  {activePlanId === "trial" ? "Período de Prueba Gratuita (14 Días)" : `Plan ${PLANS.find(p => p.id === activePlanId)?.name} Activo`}
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                {activePlanId === "trial"
                  ? "Tienes acceso completo a todas las funciones profesionales para evaluar el sistema en tu negocio."
                  : "Tu suscripción se encuentra activa y al día con facturación electrónica habilitada."}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Empresa</span>
              <span className="text-sm font-bold text-text-main">{settings.trade_name}</span>
            </div>
          </div>

          {/* Real Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Sucursales</span>
              <div className="text-lg font-black text-text-main mt-0.5 font-mono">1 Activa</div>
              <span className="text-[10px] text-text-muted truncate block">{settings.branch_name}</span>
            </div>

            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Productos</span>
              <div className="text-lg font-black text-text-main mt-0.5 font-mono">{products.length} SKUs</div>
              <span className="text-[10px] text-text-muted block">En inventario</span>
            </div>

            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Comprobantes</span>
              <div className="text-lg font-black text-emerald-500 mt-0.5 font-mono">{invoices.length} Emitidos</div>
              <span className="text-[10px] text-text-muted block">Hacienda v4.4</span>
            </div>

            <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Estado Cuenta</span>
              <div className="text-lg font-black text-primary mt-0.5 font-mono">Al Día</div>
              <span className="text-[10px] text-text-muted block">Sin cobros sorpresa</span>
            </div>
          </div>
        </Card>

        {/* Billing Cycle Switcher */}
        <div className="flex flex-col items-center justify-center space-y-3 pt-2">
          <div className="p-1 bg-surface-secondary border border-border rounded-2xl inline-flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              Facturación Mensual
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              <span>Facturación Anual</span>
              <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] rounded-md font-black">
                -20% (2 meses gratis)
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
            const isCurrentPlan = activePlanId === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 rounded-3xl transition-all ${
                  plan.popular
                    ? "border-2 border-primary shadow-xl ring-1 ring-primary/20 bg-surface"
                    : "border border-border bg-surface"
                }`}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black tracking-wider uppercase rounded-full shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-text-main">{plan.name}</h3>
                    <p className="text-xs text-text-muted min-h-[32px]">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-text-main font-mono">
                        {formatCRC(price)}
                      </span>
                      <span className="text-xs text-text-muted font-medium">/ mes</span>
                    </div>
                    {billingCycle === "annual" && (
                      <p className="text-[11px] text-emerald-500 font-bold mt-0.5">
                        Cobro anual de {formatCRC(plan.annualPrice)} / año
                      </p>
                    )}
                  </div>

                  {/* Limits summary */}
                  <div className="p-3 bg-surface-secondary rounded-2xl border border-border text-xs space-y-1.5 font-medium">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Sucursales:</span>
                      <span className="text-text-main font-bold">{plan.limits.branches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Cajas POS:</span>
                      <span className="text-text-main font-bold">{plan.limits.terminals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Hacienda CR:</span>
                      <span className="text-emerald-500 font-bold">{plan.limits.invoices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Catálogo:</span>
                      <span className="text-text-main font-bold">{plan.limits.products}</span>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                      Incluye:
                    </span>
                    <ul className="space-y-2 text-xs text-text-secondary">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border">
                  <Button
                    variant={plan.popular ? "primary" : "secondary"}
                    className="w-full font-bold py-3 text-xs sm:text-sm"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isCurrentPlan ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Plan Activo
                      </span>
                    ) : (
                      <>
                        Elegir Plan {plan.name}
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-text-main">Preguntas Frecuentes sobre los Planes</h2>
            <p className="text-xs text-text-muted">Todo lo que necesitas saber sobre pagos y facturación en Costa Rica</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <Card className="p-4 space-y-1.5">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                ¿Qué métodos de pago aceptan en Costa Rica?
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Aceptamos transferencias por <strong>SINPE Móvil</strong>, transferencias electrónicas bancarias directas (IBAN BAC, BCR, BNCR) y tarjetas de crédito/débito.
              </p>
            </Card>

            <Card className="p-4 space-y-1.5">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                ¿Los planes incluyen la firma digital y Hacienda v4.4?
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Sí. Todos los planes incluyen firmado digital XAdES-BES, generación de XML v4.4, cálculo de clave de 50 dígitos y validación ante el Ministerio de Hacienda.
              </p>
            </Card>

            <Card className="p-4 space-y-1.5">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Totalmente. Puedes subir o ajustar tu plan en cualquier momento sin perder ningún dato de ventas, inventario ni facturas históricas.
              </p>
            </Card>

            <Card className="p-4 space-y-1.5">
              <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                ¿Mis datos se borran si vence el período de prueba?
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                No. Tu información, catálogo, clientes y facturas permanecen seguros y resguardados para que los reactives cuando elijas tu plan.
              </p>
            </Card>
          </div>
        </div>

        {/* Plan Checkout & Activation Modal */}
        {selectedPlan && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedPlan(null)}
            title={`Activar Plan ${selectedPlan.name}`}
            maxWidth="md"
          >
            <div className="space-y-5">
              {/* Summary */}
              <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-main">Plan Seleccionado:</span>
                  <span className="text-sm font-black text-primary font-mono">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Ciclo de Cobro:</span>
                  <span className="font-bold text-text-main">
                    {billingCycle === "monthly" ? "Mensual" : "Anual (Ahorro 20%)"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-xs font-bold text-text-main">Monto Total:</span>
                  <span className="text-xl font-black text-emerald-500 font-mono">
                    {formatCRC(billingCycle === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.annualPrice)}
                  </span>
                </div>
              </div>

              {/* Payment Methods in Costa Rica */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Instrucciones de Pago (Costa Rica)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-surface-secondary border border-border rounded-xl space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-text-main">
                      <Smartphone className="w-4 h-4 text-emerald-500" />
                      SINPE Móvil Oficial
                    </div>
                    <p className="text-text-muted font-mono text-[11px]">Tel: +506 8888-9999</p>
                    <p className="text-text-muted text-[10px]">A nombre de: Orbítica Studio S.A.</p>
                  </div>

                  <div className="p-3 bg-surface-secondary border border-border rounded-xl space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-text-main">
                      <Building2 className="w-4 h-4 text-primary" />
                      Transferencia IBAN BAC
                    </div>
                    <p className="text-text-muted font-mono text-[10px]">CR05010200009999999999</p>
                    <p className="text-text-muted text-[10px]">Cédula: 3-101-999999</p>
                  </div>
                </div>
              </div>

              {/* Contact actions */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/50688889999?text=${encodeURIComponent(
                      `Hola, deseo activar el Plan ${selectedPlan.name} (${billingCycle === "monthly" ? "Mensual" : "Anual"}) para mi negocio: ${settings.trade_name} (Cédula: ${settings.identification_number}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="secondary" className="w-full text-xs font-bold">
                      <Smartphone className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                      Contactar por WhatsApp
                    </Button>
                  </a>

                  <a
                    href={`mailto:ventas@orbitica.app?subject=Suscripci%C3%B3n%20Plan%20${encodeURIComponent(
                      selectedPlan.name
                    )}%20-%20${encodeURIComponent(settings.trade_name)}&body=Hola%2C%20deseo%20confirmar%20el%20Plan%20${encodeURIComponent(
                      selectedPlan.name
                    )}%20(${billingCycle === "monthly" ? "Mensual" : "Anual"})%20para%20la%20empresa%3A%20${encodeURIComponent(
                      settings.trade_name
                    )}%20con%20c%C3%A9dula%3A%20${encodeURIComponent(settings.identification_number)}.`}
                    className="block"
                  >
                    <Button variant="secondary" className="w-full text-xs font-bold">
                      Enviar por Correo
                    </Button>
                  </a>
                </div>

                <Button
                  variant="primary"
                  className="w-full font-bold py-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleConfirmPlan}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Confirmar y Activar Plan {selectedPlan.name}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Success confirmation modal */}
        {isSuccessModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsSuccessModalOpen(false)}
            title="¡Plan Activado Exitosamente!"
            maxWidth="sm"
          >
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-main">
                  Plan {PLANS.find(p => p.id === activePlanId)?.name} Habilitado
                </h3>
                <p className="text-xs text-text-muted">
                  Tu negocio <strong>{settings.trade_name}</strong> ahora cuenta con los beneficios y capacidades del plan contratado.
                </p>
              </div>
              <Button variant="primary" onClick={() => setIsSuccessModalOpen(false)} className="w-full">
                Entendido, Continuar
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}