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
  Tag,
  Flame,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";
import { PricingPlanTier } from "@/types";

const PLANS: PricingPlanTier[] = [
  {
    id: "inicio",
    name: "Orbítica Inicio",
    monthlyPrice: 9900,
    annualPrice: 99000, // 10 meses
    foundersMonthlyPrice: 7920,
    description: "Ideal para emprendimientos, sodas, pulperías y pequeños comercios.",
    limits: {
      users: "2 Usuarios",
      branches: "1 Sucursal",
      terminals: "1 Caja POS",
      invoices: "Hacienda v4.4 Incluida",
    },
    features: [
      "Punto de Venta POS completo y táctil",
      "Facturación Electrónica Hacienda v4.4",
      "Cotizaciones y Proformas comerciales",
      "Catálogo de productos y servicios",
      "Control de inventario y stock",
      "Directorio de clientes y proveedores",
      "Registro de compras y gastos",
      "Apertura y cierre de caja con Arqueo Z",
      "Cuentas por cobrar básicas",
      "Cupones y promociones de descuento",
      "10 Reportes esenciales del negocio",
      "Soporte estándar por Correo",
    ],
  },
  {
    id: "crece",
    name: "Orbítica Crece",
    popular: true,
    badge: "MÁS POPULAR",
    monthlyPrice: 17900,
    annualPrice: 179000, // 10 meses
    foundersMonthlyPrice: 14320,
    description: "Ideal para negocios en crecimiento que requieren control total y multi-caja.",
    limits: {
      users: "8 Usuarios",
      branches: "Hasta 3 Sucursales",
      terminals: "Múltiples Cajas",
      invoices: "Hacienda v4.4 Ilimitada",
    },
    features: [
      "Todo lo incluido en el plan Inicio",
      "Hasta 3 sucursales y varias bodegas",
      "Múltiples cajas POS simultáneas en red",
      "Facturación y ventas en modo Offline",
      "Bancos, cuentas IBAN y conciliación",
      "Cuentas por cobrar y pagar completas",
      "Club de Fidelidad, puntos y recompensas",
      "Comisiones automáticas para vendedores",
      "Citas y Órdenes de trabajo / taller",
      "Despacho de pedidos y control de entregas",
      "Importación de catálogo mediante Excel",
      "Automatizaciones de negocio",
      "Reportes avanzados y resumen D-104",
      "Soporte prioritario por WhatsApp y Email",
    ],
  },
  {
    id: "escala",
    name: "Orbítica Escala",
    badge: "EMPRESAS EN EXPANSIÓN",
    monthlyPrice: 27900,
    annualPrice: 279000, // 10 meses
    foundersMonthlyPrice: 22320,
    description: "Para negocios con varias sucursales, distribución u operaciones de mayor volumen.",
    limits: {
      users: "Usuarios Ilimitados*",
      branches: "Hasta 10 Sucursales",
      terminals: "Cajas Ilimitadas",
      invoices: "Hacienda v4.4 Ilimitada",
    },
    features: [
      "Todo lo incluido en el plan Crece",
      "Usuarios operativos ilimitados*",
      "Hasta 10 sucursales y bodegas centralizadas",
      "Facturación masiva por lote mediante Excel",
      "Ruteo inteligente y asignación de choferes",
      "Membresías y campañas de marketing",
      "Importación automática de XML de proveedores",
      "API REST y Webhooks para integraciones",
      "Pronósticos de demanda e inventario",
      "Alertas inteligentes de reposición",
      "Auditoría de seguridad y trazabilidad total",
      "Más de 30 reportes analíticos por área",
      "Tienda en línea conectada al inventario",
      "Soporte prioritario avanzado VIP",
    ],
  },
  {
    id: "empresarial",
    name: "Orbítica Empresarial",
    badge: "A MEDIDA",
    isCustom: true,
    monthlyPrice: 44900,
    annualPrice: 449000,
    description: "Solución corporativa integral para cadenas, franquicias y distribuidoras.",
    limits: {
      users: "Sin Límites",
      branches: "Personalizadas",
      terminals: "Infraestructura Dedicada",
      invoices: "Alto Volumen",
    },
    features: [
      "Todo lo incluido en el plan Escala",
      "Cantidad de sucursales personalizada",
      "Operaciones y servidores de alto volumen",
      "Módulo contable integrado",
      "Recursos humanos y nómina",
      "Control de asistencia y marcadas de personal",
      "Integraciones personalizadas con ERP / WMS",
      "Migración avanzada de información asistida",
      "Configuración y onboarding acompañado",
      "Capacitación presencial y virtual",
      "Soporte dedicado con gerente de cuenta",
      "Acuerdo de nivel de servicio (SLA 99.9%)",
      "Desarrollo de funciones especiales a medida",
    ],
  },
];

interface ComparisonCategory {
  title: string;
  features: {
    name: string;
    inicio: string | boolean;
    crece: string | boolean;
    escala: string | boolean;
    empresarial: string | boolean;
  }[];
}

const COMPARISON_DATA: ComparisonCategory[] = [
  {
    title: "1. Punto de Venta (POS) & Facturación Fiscal",
    features: [
      { name: "Punto de Venta POS rápido y táctil", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Facturación Electrónica Hacienda v4.4", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Tiquetes (04) y Facturas con Cédula (01)", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Cotizaciones y Proformas Comerciales", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Apertura y Cierre de Caja con Arqueo Z", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Facturación y Venta en Modo Offline", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Facturación Masiva por Lote (Excel/CSV)", inicio: false, crece: false, escala: true, empresarial: true },
    ],
  },
  {
    title: "2. Catálogo, Inventario & Bodegas",
    features: [
      { name: "Catálogo de Productos y Servicios", inicio: "Completo", crece: "Completo", escala: "Completo", empresarial: "Completo" },
      { name: "Control de Stock y Kárdex de Movimientos", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Multi-Bodega por Sucursal", inicio: "1 Bodega", crece: "Hasta 3 Bodegas", escala: "Hasta 10 Bodegas", empresarial: "Ilimitadas" },
      { name: "Importación de Catálogo desde Excel", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Importación Automática de XML Hacienda", inicio: false, crece: false, escala: true, empresarial: true },
      { name: "Pronósticos de Demanda y Reposición", inicio: false, crece: false, escala: true, empresarial: true },
      { name: "Tienda en Línea Conectada a Stock", inicio: false, crece: false, escala: true, empresarial: true },
    ],
  },
  {
    title: "3. Comercial, Clientes & CRM",
    features: [
      { name: "Directorio de Clientes y Proveedores", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Cuentas por Cobrar", inicio: "Básicas", crece: "Completas", escala: "Avanzadas con Intereses", empresarial: "Centralizadas" },
      { name: "Cupones y Descuentos Promocionales", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Club de Fidelidad & Puntos Acumulables", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Comisiones para Vendedores", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Citas y Órdenes de Servicio / Taller", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Despachos, Envíos y Rutas de Entrega", inicio: false, crece: true, escala: "Ruteo Avanzado", empresarial: "Gestión Flotas" },
      { name: "Membresías y Campañas de Marketing", inicio: false, crece: false, escala: true, empresarial: true },
    ],
  },
  {
    title: "4. Finanzas, Bancos & Flujo de Caja",
    features: [
      { name: "Compras y Gastos Operativos", inicio: true, crece: true, escala: true, empresarial: true },
      { name: "Cuentas por Pagar a Proveedores", inicio: "Básicas", crece: "Completas", escala: "Automatizadas", empresarial: "Centralizadas" },
      { name: "Cuentas Bancarias IBAN y SINPE Móvil", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Conciliación Bancaria de Ventas POS", inicio: false, crece: true, escala: true, empresarial: true },
      { name: "Reportes Financieros y Resumen D-104", inicio: "10 Reportes", crece: "Avanzados", escala: "+30 Reportes", empresarial: "Personalizados" },
      { name: "Módulo de Contabilidad Integrada", inicio: false, crece: false, escala: false, empresarial: true },
    ],
  },
  {
    title: "5. Administración, Integraciones & Soporte",
    features: [
      { name: "Usuarios de Sistema Incluidos", inicio: "2 Usuarios", crece: "8 Usuarios", escala: "Ilimitados*", empresarial: "Sin Límites" },
      { name: "Sucursales Incluidas", inicio: "1 Sucursal", crece: "Hasta 3", escala: "Hasta 10", empresarial: "Personalizadas" },
      { name: "Roles y Permisos de Personal", inicio: "Estándar", crece: "Personalizados", escala: "Granulares", empresarial: "Corporativos" },
      { name: "Auditoría de Seguridad y Trazabilidad", inicio: "Básica", crece: "Completa", escala: "Avanzada", empresarial: "Forense" },
      { name: "API REST y Webhooks", inicio: false, crece: false, escala: true, empresarial: "Dedicada" },
      { name: "Recursos Humanos y Control de Asistencia", inicio: false, crece: false, escala: false, empresarial: true },
      { name: "Nivel de Soporte y SLA", inicio: "Email Estándar", crece: "WhatsApp y Email", escala: "WhatsApp VIP Prioritario", empresarial: "Gerente 24/7 + SLA 99.9%" },
    ],
  },
];

export default function SubscriptionPage() {
  const { settings, products, invoices, foundersPromo } = useStore();
  const { user } = useAuth();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [applyFoundersPromo, setApplyFoundersPromo] = useState<boolean>(foundersPromo.is_active);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanTier | null>(null);
  const [activePlanId, setActivePlanId] = useState<string>("trial");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const isPromoEligible = foundersPromo.is_active;

  const handleSelectPlan = (plan: PricingPlanTier) => {
    setSelectedPlan(plan);
  };

  const handleConfirmPlan = () => {
    if (selectedPlan) {
      setActivePlanId(selectedPlan.id);
      setSelectedPlan(null);
      setIsSuccessModalOpen(true);
    }
  };

  const calculateDisplayPrice = (plan: PricingPlanTier) => {
    if (plan.isCustom) return { price: plan.monthlyPrice, isCustom: true };

    if (billingCycle === "annual") {
      // Annual calculation
      if (applyFoundersPromo && isPromoEligible) {
        const discountAnnual = Math.round(plan.annualPrice * (1 - foundersPromo.discount_percentage / 100));
        return {
          price: Math.round(discountAnnual / 12),
          annualTotal: discountAnnual,
          regularAnnual: plan.annualPrice,
          regularPrice: Math.round(plan.annualPrice / 12),
          isCustom: false,
          isDiscounted: true,
        };
      }
      return {
        price: Math.round(plan.annualPrice / 12),
        annualTotal: plan.annualPrice,
        regularPrice: Math.round(plan.annualPrice / 12),
        isCustom: false,
        isDiscounted: false,
      };
    } else {
      // Monthly calculation
      if (applyFoundersPromo && isPromoEligible && plan.foundersMonthlyPrice) {
        return {
          price: plan.foundersMonthlyPrice,
          regularPrice: plan.monthlyPrice,
          isCustom: false,
          isDiscounted: true,
        };
      }
      return {
        price: plan.monthlyPrice,
        regularPrice: plan.monthlyPrice,
        isCustom: false,
        isDiscounted: false,
      };
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-text-main tracking-tight">Planes y Precios Transparentes</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {settings.trade_name} — Más funciones, mejor experiencia y precios justos para los negocios costarricenses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" className="py-1.5 px-3 font-mono text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {activePlanId === "trial" ? "Prueba Gratuita (14 Días)" : `Plan ${PLANS.find(p => p.id === activePlanId)?.name || "Activo"}`}
            </Badge>
          </div>
        </div>

        {/* Founders Promo Launch Banner */}
        {foundersPromo.is_active && (
          <div className="p-5 bg-gradient-to-r from-emerald-500/15 via-primary-subtle to-cyan-500/15 border-2 border-emerald-500/40 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    OFERTA DE LANZAMIENTO
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    PRECIO FUNDADORES ({foundersPromo.discount_percentage}% OFF)
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-text-main">
                  20% de descuento durante los primeros 12 meses de tu suscripción
                </h2>
                <p className="text-xs text-text-muted max-w-2xl">
                  Aprovecha las tarifas especiales para los primeros negocios en Costa Rica. Incluye todas las funciones, facturación Hacienda v4.4 y soporte prioritario.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                <div className="p-3 bg-surface rounded-2xl border border-border text-left sm:text-right">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-text-muted">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Cupos Disponibles:</span>
                  </div>
                  <div className="text-sm font-black text-primary font-mono mt-0.5">
                    {Math.max(0, foundersPromo.max_claims - foundersPromo.claimed_count)} de {foundersPromo.max_claims} cupos
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setApplyFoundersPromo(!applyFoundersPromo)}
                  className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border shadow-sm ${
                    applyFoundersPromo
                      ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500"
                      : "bg-surface border-border text-text-main hover:bg-surface-secondary"
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  {applyFoundersPromo ? "✓ Precio Fundadores Aplicado" : "Aplicar Precio Fundadores"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Organization Status Card */}
        <Card className="border-l-4 border-l-primary space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-main">
                  {activePlanId === "trial" ? "Período de Evaluación Gratuita Activo" : `Plan ${PLANS.find(p => p.id === activePlanId)?.name} Activo`}
                </h3>
              </div>
              <p className="text-xs text-text-muted">
                {activePlanId === "trial"
                  ? "14 días de prueba completa sin tarjeta de crédito. Puedes cambiarte a cualquier plan en cualquier momento."
                  : "Tu cuenta está activa con facturación electrónica y todos los módulos habilitados."}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Empresa Activa</span>
              <span className="text-xs font-black text-text-main">{settings.trade_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Prueba Gratis</span>
              <div className="text-base font-black text-emerald-500 mt-0.5 font-mono">14 Días</div>
              <span className="text-[10px] text-text-muted block">Sin tarjeta requerida</span>
            </div>

            <div className="p-3 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Productos</span>
              <div className="text-base font-black text-text-main mt-0.5 font-mono">{products.length} SKUs</div>
              <span className="text-[10px] text-text-muted block">En catálogo activo</span>
            </div>

            <div className="p-3 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Comprobantes</span>
              <div className="text-base font-black text-primary mt-0.5 font-mono">{invoices.length} Emitidos</div>
              <span className="text-[10px] text-text-muted block">Hacienda v4.4</span>
            </div>

            <div className="p-3 bg-surface-secondary border border-border rounded-2xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Transparencia</span>
              <div className="text-base font-black text-text-main mt-0.5 font-mono">₡ CRC</div>
              <span className="text-[10px] text-text-muted block">Sin cobros ocultos</span>
            </div>
          </div>
        </Card>

        {/* Billing Cycle Switcher */}
        <div className="flex flex-col items-center justify-center space-y-3 pt-2">
          <div className="p-1 bg-surface-secondary border border-border rounded-2xl inline-flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              <span>Facturación Anual</span>
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-md font-black">
                Paga 10 meses (2 meses gratis)
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Tiers Grid (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const pricing = calculateDisplayPrice(plan);
            const isCurrentPlan = activePlanId === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between p-5 rounded-3xl transition-all ${
                  plan.popular
                    ? "border-2 border-primary shadow-xl ring-1 ring-primary/25 bg-surface"
                    : "border border-border bg-surface"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 text-white text-[9px] font-black tracking-wider uppercase rounded-full shadow-md ${
                      plan.popular ? "bg-primary" : "bg-cyan-600"
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-text-main">{plan.name}</h3>
                    <p className="text-[11px] text-text-muted min-h-[30px]">{plan.description}</p>
                  </div>

                  {/* Price Block */}
                  <div className="pt-2 border-t border-border">
                    {pricing.isCustom ? (
                      <div className="py-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-text-muted font-bold">desde</span>
                          <span className="text-2xl font-black text-text-main font-mono">
                            {formatCRC(pricing.price)}
                          </span>
                          <span className="text-[10px] text-text-muted font-medium">/ mes</span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5">Cotización a la medida de tu escala</p>
                      </div>
                    ) : (
                      <div>
                        {pricing.isDiscounted && pricing.regularPrice && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs line-through text-text-muted font-mono">
                              {formatCRC(pricing.regularPrice)}
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded">
                              -{foundersPromo.discount_percentage}% FUNDADORES
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-text-main font-mono">
                            {formatCRC(pricing.price)}
                          </span>
                          <span className="text-[10px] text-text-muted font-medium">/ mes</span>
                        </div>
                        {billingCycle === "annual" && (
                          <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
                            {formatCRC(pricing.annualTotal || plan.annualPrice)} / año (10 mensualidades)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Limits summary badge box */}
                  <div className="p-2.5 bg-surface-secondary rounded-xl border border-border text-[11px] space-y-1 font-medium">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Usuarios:</span>
                      <span className="text-text-main font-bold">{plan.limits.users}</span>
                    </div>
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
                  </div>

                  {/* Feature list */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Incluye:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-text-secondary">
                      {plan.features.slice(0, 5).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border">
                  <Button
                    variant={plan.popular ? "primary" : "secondary"}
                    className="w-full font-bold py-2.5 text-xs"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isCurrentPlan ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Plan Activo
                      </span>
                    ) : (
                      <>
                        {plan.isCustom ? "Contactar Asesor" : `Elegir ${plan.name}`}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparator Toggle & Table */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-text-main">Comparador Detallado de Funciones</h3>
              <p className="text-xs text-text-muted">Revisa la matriz completa de características módulo por módulo.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="gap-1.5 font-bold text-xs"
            >
              {showComparison ? "Ocultar Comparativa" : "Ver Comparativa Completa"}
              {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showComparison && (
            <Card className="overflow-hidden p-0 border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Tabla comparativa de funciones por plan">
                  <thead>
                    <tr className="bg-surface-secondary border-b border-border text-text-main font-black">
                      <th scope="col" className="p-3.5 min-w-[240px]">Módulo / Funcionalidad</th>
                      <th scope="col" className="p-3.5 text-center min-w-[120px]">Inicio</th>
                      <th scope="col" className="p-3.5 text-center min-w-[120px] bg-primary/5 text-primary">Crece ⭐</th>
                      <th scope="col" className="p-3.5 text-center min-w-[120px]">Escala</th>
                      <th scope="col" className="p-3.5 text-center min-w-[120px]">Empresarial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COMPARISON_DATA.map((cat, catIdx) => (
                      <React.Fragment key={catIdx}>
                        <tr className="bg-surface-secondary/70 font-black text-text-main text-[11px]">
                          <td colSpan={5} className="px-3.5 py-2.5 uppercase tracking-wider text-primary font-bold">
                            {cat.title}
                          </td>
                        </tr>
                        {cat.features.map((feat, fIdx) => (
                          <tr key={fIdx} className="hover:bg-surface-hover transition-colors text-[11px]">
                            <td className="p-3 font-medium text-text-main">{feat.name}</td>
                            
                            <td className="p-3 text-center">
                              {typeof feat.inicio === "boolean" ? (
                                feat.inicio ? (
                                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )
                              ) : (
                                <span className="font-bold text-text-secondary">{feat.inicio}</span>
                              )}
                            </td>

                            <td className="p-3 text-center bg-primary/5 font-bold text-text-main">
                              {typeof feat.crece === "boolean" ? (
                                feat.crece ? (
                                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )
                              ) : (
                                <span className="font-bold text-primary">{feat.crece}</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {typeof feat.escala === "boolean" ? (
                                feat.escala ? (
                                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )
                              ) : (
                                <span className="font-bold text-text-secondary">{feat.escala}</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {typeof feat.empresarial === "boolean" ? (
                                feat.empresarial ? (
                                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )
                              ) : (
                                <span className="font-bold text-cyan-500">{feat.empresarial}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Commercial Conditions Guarantee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-surface border border-border rounded-2xl space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-text-main">14 Días de Prueba Gratuita</h4>
            <p className="text-[11px] text-text-muted">Sin necesidad de registrar tarjeta de crédito. Acceso completo a todas las funciones para evaluar tu negocio.</p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-2xl space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-text-main">Sin Comisiones Ocultas</h4>
            <p className="text-[11px] text-text-muted">No cobramos porcentaje por cada venta realizada. Tarifa fija mensual en Colones costarricenses (CRC).</p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-2xl space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-text-main">Cancelación Flexible</h4>
            <p className="text-[11px] text-text-muted">Puedes actualizar, cambiar de plan o cancelar tu suscripción en cualquier momento sin contratos de permanencia.</p>
          </div>
        </div>

        {/* Plan Selection Confirmation Modal */}
        {selectedPlan && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedPlan(null)}
            title={`Confirmar Suscripción — ${selectedPlan.name}`}
            maxWidth="sm"
          >
            <div className="space-y-4">
              <div className="p-4 bg-surface-secondary border border-border rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-main">Plan Seleccionado:</span>
                  <span className="text-xs font-black text-primary">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-main">Ciclo de Cobro:</span>
                  <span className="text-xs font-bold capitalize">{billingCycle === "annual" ? "Anual (10 Meses)" : "Mensual"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-xs font-bold text-text-main">Total a Facturar:</span>
                  <span className="text-base font-black font-mono text-emerald-500">
                    {formatCRC(
                      selectedPlan.isCustom
                        ? selectedPlan.monthlyPrice
                        : calculateDisplayPrice(selectedPlan).price
                    )}
                    <span className="text-[10px] text-text-muted font-normal"> / mes</span>
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 font-medium space-y-1">
                <p>✓ Facturación Electrónica Hacienda v4.4 activa.</p>
                <p>✓ 14 días de prueba inicial sin compromiso.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="secondary" onClick={() => setSelectedPlan(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleConfirmPlan}>
                  {selectedPlan.isCustom ? "Solicitar Contacto" : "Confirmar y Activar Plan"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Success Modal */}
        {isSuccessModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsSuccessModalOpen(false)}
            title="¡Plan Actualizado con Éxito!"
            maxWidth="sm"
          >
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-text-main">Suscripción Activada</h3>
                <p className="text-xs text-text-muted">
                  Tu plan se ha actualizado correctamente. Todas las funciones correspondientes están disponibles para tu organización.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="primary" className="w-full" onClick={() => setIsSuccessModalOpen(false)}>
                  Entendido y Continuar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </OwnerLayout>
  );
}