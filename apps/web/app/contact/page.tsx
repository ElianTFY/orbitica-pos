"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setIsSent(true);
  };

  return (
    <div className="min-h-screen bg-surface-secondary/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/login" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <BrandLogo size="md" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <span className="text-xs font-black text-primary uppercase tracking-wider">Atención Comercial y Soporte</span>
              <h1 className="text-3xl font-black text-text-main tracking-tight mt-1">Contacto Oficial</h1>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Estamos disponibles para ayudarte con la implementación de Orbítica POS, asesoría tributaria para ATV / Hacienda y planes comerciales para tu negocio.
              </p>
            </div>

            <div className="space-y-4 text-xs text-text-muted">
              <div className="flex items-start gap-3 p-4 bg-surface rounded-2xl border border-border">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-text-main">Correo Electrónico</div>
                  <a href="mailto:soporte@orbitica.cr" className="hover:text-primary transition-colors">soporte@orbitica.cr</a>
                  <div className="text-[11px] text-text-muted mt-0.5">Respuesta en menos de 2 horas hábiles</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-surface rounded-2xl border border-border">
                <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-text-main">Central Telefónica y WhatsApp</div>
                  <div>+506 4000-0000</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Lunes a Sábado: 8:00 AM - 7:00 PM</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-surface rounded-2xl border border-border">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-text-main">Oficinas Centrales</div>
                  <div>San José, Escazú Corporate Center</div>
                  <div className="text-[11px] text-text-muted mt-0.5">San José, Costa Rica</div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-surface p-8 rounded-3xl border border-border shadow-sm">
            {isSent ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-text-main">¡Mensaje Enviado con Éxito!</h2>
                <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                  Gracias por comunicarte con Orbítica POS. Uno de nuestros especialistas se pondrá en contacto contigo a la brevedad.
                </p>
                <Button variant="secondary" onClick={() => setIsSent(false)} className="text-xs font-bold">
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-black text-text-main">Envíanos un mensaje</h2>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Nombre Completo *</label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mora"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Correo Electrónico *</label>
                  <Input
                    type="email"
                    required
                    placeholder="nombre@tutienda.cr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Asunto</label>
                  <Input
                    type="text"
                    placeholder="Ej. Cotización multi-sucursal / Integración fiscal"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Mensaje *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Cuéntanos sobre tu comercio o tu consulta técnica..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs rounded-xl border border-border bg-surface px-3 py-2 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full text-xs font-bold gap-2">
                  <Send className="w-4 h-4" /> Enviar Mensaje
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
