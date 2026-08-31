"use client";

import React, { useState } from "react";
import { Building, MapPin, Plus, Store, CheckCircle } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";

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
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Sucursal
          </Button>
        </div>

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
                {settings.address}
              </p>
              <div className="pt-2 border-t border-border flex justify-between">
                <span>Cajas Habilitadas:</span>
                <span className="text-text-main font-bold">2 Cajas (POS-01, POS-02)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}