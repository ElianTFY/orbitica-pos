"use client";

import React from "react";
import { Building, MapPin, Store, CheckCircle, Info } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BranchesPage() {
  const { settings } = useStore();

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Sucursales y Puntos de Venta</h1>
            <p className="text-xs text-text-muted">
              {settings.trade_name} — Administración de locales comerciales y cajas asignadas
            </p>
          </div>
        </div>

        {/* Main Branch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-primary space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text-main">{settings.branch_name}</h3>
              </div>
              <Badge variant="success">Principal (001)</Badge>
            </div>
            <div className="space-y-2 text-xs text-text-muted">
              <p className="flex items-center gap-1.5 text-text-secondary">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {settings.address || "Dirección no configurada"}
              </p>
              <div className="pt-2 border-t border-border flex justify-between">
                <span>Estado:</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Activa
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Info: multi-branch coming */}
        <Card>
          <div className="flex items-start gap-4 p-2">
            <div className="w-10 h-10 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-text-main">Gestión de Sucursales</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Para modificar el nombre o dirección de tu sucursal principal, ve a{" "}
                <Link href="/settings" className="text-primary underline font-semibold hover:opacity-80">
                  Configuración del Negocio
                </Link>
                . La gestión de múltiples sucursales y cajas adicionales estará disponible en el Plan Pro.
              </p>
            </div>
            <Link href="/settings">
              <Button variant="secondary" size="sm">
                Ir a Configuración
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </OwnerLayout>
  );
}