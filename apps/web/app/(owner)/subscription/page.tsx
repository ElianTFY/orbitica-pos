"use client";

import React from "react";
import { Sparkles, Check, Building, Users, Shield, Calendar } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";

export default function SubscriptionPage() {
  const { settings, products } = useStore();
  const { user } = useAuth();

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Suscripción y Estado de Cuenta</h1>
          <p className="text-xs text-text-muted">
            {settings.trade_name} — Plan contratado, período de prueba y límites de la plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-l-4 border-l-primary space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-text-main">Prueba Gratuita Oficial (14 Días)</h2>
                </div>
                <p className="text-xs text-text-muted">Acceso completo a todas las funciones profesionales</p>
              </div>
              <Badge variant="success">PRUEBA ACTIVA</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
                <span className="text-[10px] text-text-muted uppercase font-bold">Sucursales</span>
                <div className="text-lg font-black text-text-main mt-0.5 font-mono">1 Activa</div>
                <span className="text-[10px] text-text-muted">{settings.branch_name}</span>
              </div>

              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
                <span className="text-[10px] text-text-muted uppercase font-bold">Productos Registrados</span>
                <div className="text-lg font-black text-text-main mt-0.5 font-mono">{products.length} / Ilimitados</div>
                <span className="text-[10px] text-text-muted">SKUs en catálogo</span>
              </div>

              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl">
                <span className="text-[10px] text-text-muted uppercase font-bold">Facturación Hacienda</span>
                <div className="text-lg font-black text-emerald-500 mt-0.5 font-mono">Ilimitada</div>
                <span className="text-[10px] text-text-muted">v4.4 XAdES-BES</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Beneficios Incluidos:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Facturación Electrónica v4.4 Ilimitada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Punto de Venta POS Móvil y Táctil</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Control de Inventario y Kárdex</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Arqueo de Caja y Cierres Z</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-text-main">Información de Facturación SaaS</h3>
              <div className="p-3.5 bg-surface-secondary border border-border rounded-2xl text-xs space-y-2 text-text-muted">
                <div><strong>Organización:</strong> <span className="text-text-main">{settings.trade_name}</span></div>
                <div><strong>Cédula:</strong> <span className="text-text-main font-mono">{settings.identification_number}</span></div>
                <div><strong>Propietario:</strong> <span className="text-text-main">{user?.full_name || "Owner"}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href={`mailto:ventas@orbitica.app?subject=Actualizar%20Plan%20-%20${encodeURIComponent(settings.trade_name)}&body=Hola%2C%20me%20interesa%20actualizar%20mi%20plan.%20Mi%20empresa%20es%3A%20${encodeURIComponent(settings.trade_name)}`}
                className="block"
              >
                <Button variant="primary" className="w-full">
                  Elegir Plan Definitivo
                </Button>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}