"use client";

import React, { useState } from "react";
import {
  UserCog,
  UserPlus,
  Search,
  Mail,
  Phone,
  Shield,
  Users,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">
              Gestión de Empleados
            </h1>
            <p className="text-xs text-text-muted">
              Administra el acceso y roles del personal de tu negocio
            </p>
          </div>
          <Button variant="primary" disabled className="gap-2 opacity-60 cursor-not-allowed">
            <UserPlus className="w-4 h-4" />
            Agregar Empleado
          </Button>
        </div>

        {/* Feature Coming Soon card */}
        <Card>
          <div className="flex flex-col items-center justify-center text-center py-16 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center">
              <UserCog className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text-main">
                Módulo de Empleados
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                Esta sección te permitirá registrar empleados, asignar roles (cajero, inventario, gerente), 
                controlar accesos por sucursal y gestionar turnos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mt-2">
              {[
                { icon: Users, title: "Control de Acceso", desc: "Asigna permisos por módulo" },
                { icon: Shield, title: "Roles de Seguridad", desc: "Cajero, Gerente, Inventario" },
                { icon: Mail, title: "Invitación por Email", desc: "Invita a tu equipo con un clic" },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="p-4 bg-surface-secondary border border-border rounded-2xl text-left space-y-2"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-text-main">{title}</h3>
                  <p className="text-[11px] text-text-muted">{desc}</p>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-warning-bg border border-warning-border text-warning-text rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-warning-badge animate-pulse" />
              Próximamente disponible en el plan Pro
            </div>
          </div>
        </Card>
      </div>
    </OwnerLayout>
  );
}