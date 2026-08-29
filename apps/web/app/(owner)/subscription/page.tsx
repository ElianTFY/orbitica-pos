"use client";

import React from "react";
import { Sparkles, Check, Building, Users, Shield } from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";

export default function SubscriptionPage() {
  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Suscripción SaaS Orbítica</h1>
          <p className="text-xs text-[#8E929E]">Detalles del plan contratado, límites de sucursales y características activas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-l-4 border-l-[#0EA5FF] space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0EA5FF]" />
                  <h3 className="text-lg font-bold text-white">Plan Pro Empresarial</h3>
                </div>
                <p className="text-xs text-[#8E929E]">Facturación mensual recurrente</p>
              </div>
              <Badge variant="success">ACTIVO</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-[#1A1B1F] rounded-xl">
                <span className="text-[10px] text-[#8E929E] uppercase">Sucursales</span>
                <div className="text-lg font-bold text-white mt-0.5">2 / 5</div>
              </div>

              <div className="p-3 bg-[#1A1B1F] rounded-xl">
                <span className="text-[10px] text-[#8E929E] uppercase">Colaboradores</span>
                <div className="text-lg font-bold text-white mt-0.5">4 / 15</div>
              </div>

              <div className="p-3 bg-[#1A1B1F] rounded-xl">
                <span className="text-[10px] text-[#8E929E] uppercase">Precio Mensual</span>
                <div className="text-lg font-bold text-[#0EA5FF] mt-0.5">{formatCRC(25000)}</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#26282E]">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Características Incluidas:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#CFCFD4]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Facturación Electrónica v4.3 Ilimitada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Punto de Venta POS de Alta Velocidad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Libro Mayor de Inventario Inmutable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Arqueos Ciegos y Control de Cajas</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
