import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);
    if (user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();

    if (!query) {
      return NextResponse.json({
        success: true,
        data: {
          companies: [],
          tickets: [],
          invoices: [],
          users: [],
          total_results: 0,
        },
      });
    }

    // In Next.js App Router, we search across known platform registry or server-side memory
    const mockCompanies = [
      { id: "org_soda_parque", trade_name: "Soda El Parque", legal_name: "Inversiones El Parque S.A.", cedula: "3101888999", plan: "crece", state: "trial", email: "info@elparque.cr" },
      { id: "org_super_sanpedro", trade_name: "Supermercado San Pedro", legal_name: "Comercial San Pedro Ltda.", cedula: "3101555666", plan: "escala", state: "active", email: "ventas@sanpedro.cr" },
      { id: "org_boutique_escazu", trade_name: "Boutique Glamour Escazú", legal_name: "Moda y Estilo CR S.A.", cedula: "3101222333", plan: "inicio", state: "active", email: "contacto@glamour.cr" },
    ];

    const mockTickets = [
      { id: "tick_101", ticket_number: "TICK-8021", subject: "Error 401 en firma de tiquete electrónico", org_name: "Soda El Parque", category: "HACIENDA", priority: "HIGH", status: "OPEN" },
      { id: "tick_102", ticket_number: "TICK-8022", subject: "Duda con importación de productos desde CSV", org_name: "Boutique Glamour Escazú", category: "MIGRATION", priority: "MEDIUM", status: "WAITING_CLIENT" },
      { id: "tick_103", ticket_number: "TICK-8023", subject: "Solicitud de ampliación de límite de cajas POS", org_name: "Supermercado San Pedro", category: "ACCOUNT", priority: "NORMAL", status: "IN_PROGRESS" },
    ];

    const companies = mockCompanies.filter(
      (c) =>
        c.trade_name.toLowerCase().includes(query) ||
        c.legal_name.toLowerCase().includes(query) ||
        c.cedula.includes(query) ||
        c.email.toLowerCase().includes(query)
    );

    const tickets = mockTickets.filter(
      (t) =>
        t.ticket_number.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.org_name.toLowerCase().includes(query)
    );

    return NextResponse.json({
      success: true,
      data: {
        query,
        companies,
        tickets,
        total_results: companies.length + tickets.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}
