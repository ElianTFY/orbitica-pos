"use client";

import React, { useState } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Shield,
  BookOpen,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Key,
  Laptop,
  ChevronRight,
  Search,
  FileQuestion,
  Headphones,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { useAuth } from "@/features/auth/auth-context";
import { SupportTicket } from "@/types";

const FAQS = [
  {
    q: "¿Cómo configuro mi llave criptográfica y PIN de Hacienda CR?",
    a: "Dirígete a Configuración > Facturación Hacienda. Selecciona si estás en ambiente de Pruebas (Staging) o Producción, ingresa tu usuario ATV de 50 caracteres y tu PIN de 4 dígitos. Pulsa 'Probar Conexión' para validar antes de emitir comprobantes reales.",
  },
  {
    q: "¿Qué sucede si se cae el internet mientras estoy vendiendo en el POS?",
    a: "Orbítica POS cuenta con modo Offline automático en los planes Crece y Escala. Puedes seguir emitiendo tiquetes de venta y el sistema los almacenará localmente en IndexedDB para firmarlos y enviarlos a Hacienda en cuanto se restablezca la conexión.",
  },
  {
    q: "¿Cómo aplico la promoción de Lanzamiento Precio Fundadores (-20%)?",
    a: "En la sección 'Mi Suscripción', asegúrate de que el interruptor de Precio Fundadores esté activo. El descuento del 20% se aplicará automáticamente tanto en el cobro mensual como en el plan anual durante tus primeros 12 meses.",
  },
  {
    q: "¿Cómo migro mi inventario anterior desde Excel?",
    a: "Ingresa al Centro de Migración (/migration), descarga nuestra plantilla oficial en CSV, pega los datos de tus productos y súbela. Podrás mapear las columnas interactivamente y revertir la importación si encuentras errores.",
  },
];

export default function SupportCenterPage() {
  const { user } = useAuth();
  const {
    supportTickets,
    createSupportTicket,
    addSupportMessage,
    activeSupportGrant,
    grantSupportAccess,
    revokeSupportAccess,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"tickets" | "grant" | "faq">("tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    supportTickets.length > 0 ? supportTickets[0].id : null
  );

  // New Ticket Form State
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState<SupportTicket["category"]>("HACIENDA");
  const [ticketPriority, setTicketPriority] = useState<SupportTicket["priority"]>("MEDIUM");
  const [ticketDescription, setTicketDescription] = useState("");
  const [newMessageText, setNewMessageText] = useState("");

  // Delegated Access Grant State
  const [grantReason, setGrantReason] = useState("");
  const [grantDuration, setGrantDuration] = useState<number>(30); // minutes
  const [grantLevel, setGrantLevel] = useState<"READ_ONLY" | "FULL_ADMIN">("READ_ONLY");

  // Search FAQ
  const [faqSearch, setFaqSearch] = useState("");

  const activeTicket = supportTickets.find((t) => t.id === selectedTicketId);

  // Handle New Ticket Submit
  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    // Collect Safe Telemetry (No passwords/PINs)
    const telemetry = {
      browser: typeof navigator !== "undefined" ? navigator.userAgent.split(" ").slice(0, 3).join(" ") : "Web Browser",
      os: typeof navigator !== "undefined" ? navigator.platform : "Windows / macOS",
      screen_res: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Desktop",
      app_version: "Orbítica POS v2.4.0 (CR Release)",
      current_route: typeof window !== "undefined" ? window.location.pathname : "/support",
    };

    const newTicket = createSupportTicket(
      {
        organization_id: user?.organization_id || "org_current",
        organization_name: user?.organization_name || "Mi Negocio",
        created_by_name: user?.full_name || "Propietario",
        created_by_email: user?.email || "admin@negocio.cr",
        category: ticketCategory,
        priority: ticketPriority,
        status: "OPEN",
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        telemetry,
      },
      ticketDescription.trim()
    );

    setIsCreatingTicket(false);
    setSelectedTicketId(newTicket.id);
    setTicketSubject("");
    setTicketDescription("");
  };

  // Handle Send Message to Active Ticket
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !newMessageText.trim()) return;
    addSupportMessage(selectedTicketId, newMessageText.trim(), false);
    setNewMessageText("");
  };

  // Handle Grant Support Access
  const handleGrantAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantReason.trim()) return;
    grantSupportAccess(grantReason.trim(), grantDuration, grantLevel);
    setGrantReason("");
  };

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="blue">CENTRO DE AYUDA & SOPORTE TÉCNICO</Badge>
            <span className="text-xs text-text-muted">Costa Rica 24/7</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-main">
            Soporte Especializado Orbítica
          </h1>
          <p className="text-xs text-text-muted">
            Crea solicitudes de ayuda técnica, consulta la base de conocimiento y autoriza asistencia temporal delegada.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-surface-secondary border border-border p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "tickets"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            Mis Solicitudes ({supportTickets.length})
          </button>
          <button
            onClick={() => setActiveTab("grant")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "grant"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            Acceso Delegado
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "faq"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            Base de Conocimiento
          </button>
        </div>
      </div>

      {/* TAB 1: TICKETS */}
      {activeTab === "tickets" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Tickets List */}
          <div className="space-y-4">
            <Card className="p-4 border border-border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-text-main uppercase tracking-wider">
                  Tickets de Soporte
                </h2>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatingTicket(true)}
                  className="text-xs font-bold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva Solicitud
                </Button>
              </div>

              {supportTickets.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted space-y-2">
                  <LifeBuoy className="w-8 h-8 text-text-muted/50 mx-auto" />
                  <p className="font-bold">No tienes solicitudes abiertas</p>
                  <p className="text-[10px]">Si tienes dudas sobre Hacienda o el POS, pulsa en 'Nueva Solicitud'.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {supportTickets.map((t) => {
                    const isSelected = t.id === selectedTicketId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setIsCreatingTicket(false);
                        }}
                        className={`w-full p-3 rounded-2xl border text-left transition-all space-y-1.5 ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-sm"
                            : "bg-surface border-border hover:bg-surface-secondary"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-primary">
                            {t.ticket_number}
                          </span>
                          <Badge
                            variant={
                              t.status === "OPEN"
                                ? "blue"
                                : t.status === "RESOLVED"
                                ? "success"
                                : "warning"
                            }
                          >
                            {t.status}
                          </Badge>
                        </div>
                        <h3 className="text-xs font-bold text-text-main truncate">{t.subject}</h3>
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span>{t.category}</span>
                          <span>{t.updated_at.split(" ")[0]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right 2 Cols: Ticket View or Creation Form */}
          <div className="lg:col-span-2 space-y-4">
            {isCreatingTicket ? (
              <Card className="p-6 border border-border shadow-sm">
                <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-black text-text-main">Nueva Solicitud de Ayuda</h2>
                      <p className="text-xs text-text-muted">
                        Un especialista técnico de Orbítica POS atenderá tu requerimiento.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreatingTicket(false)}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Asunto de la Solicitud *
                    </label>
                    <Input
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Ej. Error al firmar factura con llave criptográfica"
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">
                        Área / Categoría *
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as any)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                      >
                        <option value="HACIENDA">Facturación Hacienda CR (ATV)</option>
                        <option value="POS">Punto de Venta (POS) & Cajas</option>
                        <option value="INVOICING">Comprobantes & Notas de Crédito</option>
                        <option value="INVENTORY">Inventario & Bodegas</option>
                        <option value="PAYMENTS">Pagos, Bancos & SINPE</option>
                        <option value="MIGRATION">Migración de Datos Excel</option>
                        <option value="ACCOUNT">Cuenta & Suscripción</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">
                        Prioridad *
                      </label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value as any)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                      >
                        <option value="LOW">Baja (Consulta general)</option>
                        <option value="MEDIUM">Media (Afecta parcialmente)</option>
                        <option value="HIGH">Alta (No permite facturar)</option>
                        <option value="URGENT">Urgente (Negocio detenido)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Descripción Detallada del Problema *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="Explica qué acción estabas realizando, qué mensaje de error apareció y cualquier detalle relevante..."
                      className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-text-main resize-none"
                    />
                  </div>

                  {/* Telemetry info notice */}
                  <div className="p-3 bg-surface-secondary border border-border rounded-xl flex items-center gap-2.5 text-[11px] text-text-muted">
                    <Laptop className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      Se adjuntará automáticamente información técnica segura (Navegador, SO y versión del POS) para acelerar el diagnóstico sin compartir contraseñas ni datos sensibles.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" onClick={() => setIsCreatingTicket(false)} className="text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" variant="primary" className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500">
                      <Send className="w-4 h-4" />
                      Enviar Solicitud
                    </Button>
                  </div>
                </form>
              </Card>
            ) : activeTicket ? (
              <Card className="p-6 border border-border shadow-sm space-y-4">
                {/* Active Ticket Header */}
                <div className="border-b border-border pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold text-primary">
                        #{activeTicket.ticket_number}
                      </span>
                      <Badge variant="blue">{activeTicket.category}</Badge>
                      <Badge variant="warning">{activeTicket.priority}</Badge>
                    </div>
                    <h2 className="text-sm font-black text-text-main">{activeTicket.subject}</h2>
                  </div>
                  <Badge variant={activeTicket.status === "OPEN" ? "success" : "default"}>
                    {activeTicket.status}
                  </Badge>
                </div>

                {/* Telemetry metadata snippet */}
                {activeTicket.telemetry && (
                  <div className="p-2.5 bg-surface-secondary rounded-xl border border-border text-[10px] text-text-muted font-mono flex flex-wrap gap-x-4 gap-y-1">
                    <span>OS: {activeTicket.telemetry.os}</span>
                    <span>Versión: {activeTicket.telemetry.app_version}</span>
                    <span>Ruta: {activeTicket.telemetry.current_route}</span>
                  </div>
                )}

                {/* Messages Thread (Internal notes strictly hidden from client) */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {activeTicket.messages
                    .filter((msg) => !msg.is_internal_note)
                    .map((msg) => {
                      const isClient = msg.sender_type === "CLIENT";
                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                          isClient
                            ? "bg-surface-secondary border-border ml-6"
                            : "bg-primary/10 border-primary/30 mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-text-main flex items-center gap-1">
                            {!isClient && <Headphones className="w-3 h-3 text-primary" />}
                            {msg.sender_name}
                          </span>
                          <span className="text-text-muted">{msg.created_at}</span>
                        </div>
                        <p className="text-text-secondary leading-relaxed">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-border">
                  <Input
                    required
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Escribe una respuesta o consulta adicional..."
                    className="text-xs flex-1"
                  />
                  <Button type="submit" variant="primary" size="sm" className="font-bold text-xs gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Responder
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-8 border border-border text-center text-xs text-text-muted space-y-2">
                <MessageSquare className="w-8 h-8 text-text-muted/50 mx-auto" />
                <p className="font-bold">Selecciona una solicitud para ver la conversación</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DELEGATED SUPPORT ACCESS */}
      {activeTab === "grant" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="p-6 border border-border shadow-sm space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-sm font-black text-text-main flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Acceso Delegado Seguro para Soporte Técnico
              </h2>
              <p className="text-xs text-text-muted">
                Autoriza temporalmente a un agente de soporte de Orbítica para diagnosticar tu cuenta sin compartir contraseñas ni llaves privadas.
              </p>
            </div>

            {/* Active Grant Banner if present */}
            {activeSupportGrant && !activeSupportGrant.is_revoked ? (
              <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <span className="text-xs font-black text-text-main block">
                        Acceso Delegado ACTIVO
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        Expira: {new Date(activeSupportGrant.expires_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant="success">{activeSupportGrant.permission_level}</Badge>
                </div>

                <p className="text-xs text-text-secondary">
                  <strong>Motivo:</strong> {activeSupportGrant.reason}
                </p>

                <div className="pt-2 border-t border-emerald-500/20 flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revokeSupportAccess()}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Revocar Acceso Inmediatamente
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGrantAccessSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Motivo de la Asistencia *
                  </label>
                  <Input
                    required
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="Ej. Revisión de sincronización de inventario con sucursal 2"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Duración del Permiso *
                    </label>
                    <select
                      value={grantDuration}
                      onChange={(e) => setGrantDuration(Number(e.target.value))}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value={15}>15 Minutos (Recomendado)</option>
                      <option value={30}>30 Minutos</option>
                      <option value={60}>1 Hora</option>
                      <option value={120}>2 Horas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Nivel de Permiso *
                    </label>
                    <select
                      value={grantLevel}
                      onChange={(e) => setGrantLevel(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-main"
                    >
                      <option value="READ_ONLY">Solo Lectura (Ver configuración e informes)</option>
                      <option value="FULL_ADMIN">Administrador (Puede modificar parámetros)</option>
                    </select>
                  </div>
                </div>

                {/* Security Guarantees */}
                <div className="p-3.5 bg-surface-secondary border border-border rounded-xl space-y-1.5 text-[11px] text-text-muted">
                  <p className="font-bold text-text-main flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Garantías de Seguridad y Privacidad:
                  </p>
                  <p>• Los agentes de soporte nunca podrán visualizar contraseñas, llaves criptográficas ni PINs completos.</p>
                  <p>• Cada acción realizada queda registrada en el log de auditoría inalterable.</p>
                  <p>• Puedes revocar el acceso en cualquier momento con un solo clic.</p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-bold text-xs gap-2 bg-emerald-600 hover:bg-emerald-500 py-2.5"
                >
                  <Unlock className="w-4 h-4" />
                  Conceder Acceso Temporal a Soporte
                </Button>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: FAQ & KNOWLEDGE BASE */}
      {activeTab === "faq" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Buscar en preguntas frecuentes..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFaqs.map((faq, idx) => (
              <Card key={idx} className="p-5 border border-border shadow-sm space-y-2">
                <h3 className="text-xs font-black text-text-main flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-text-muted leading-relaxed pl-6">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
