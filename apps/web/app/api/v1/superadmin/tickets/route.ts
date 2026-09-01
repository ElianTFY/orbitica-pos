import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SupportTicket } from "@/types";

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
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const search = searchParams.get("q")?.toLowerCase();

    // Default registered tickets store
    let tickets: SupportTicket[] = [
      {
        id: "tick_101",
        ticket_number: "TICK-8021",
        organization_id: "org_soda_parque",
        organization_name: "Soda El Parque",
        created_by_name: "Carlos Montero",
        created_by_email: "carlos@elparque.cr",
        category: "HACIENDA",
        priority: "HIGH",
        status: "OPEN",
        subject: "Fallo en firma criptográfica de tiquete electrónico (Error 401)",
        description: "Al enviar la venta a Hacienda recibo un error 401. Verifiqué que mi usuario de ATV tenga 50 caracteres pero sigue fallando.",
        telemetry: {
          browser: "Chrome 122.0 Windows",
          os: "Windows 11 x64",
          screen_res: "1920x1080",
          app_version: "Orbítica POS v2.4.0",
          current_route: "/pos",
          error_code: "HACIENDA_AUTH_401",
        },
        messages: [
          {
            id: "msg_1",
            sender_type: "CLIENT",
            sender_name: "Carlos Montero",
            message: "Al enviar la venta a Hacienda recibo un error 401. Verifiqué que mi usuario de ATV tenga 50 caracteres pero sigue fallando.",
            created_at: "2026-08-31 14:30",
          },
        ],
        created_at: "2026-08-31 14:30",
        updated_at: "2026-08-31 14:30",
      },
      {
        id: "tick_102",
        ticket_number: "TICK-8022",
        organization_id: "org_boutique_escazu",
        organization_name: "Boutique Glamour Escazú",
        created_by_name: "Elena Vargas",
        created_by_email: "elena@glamour.cr",
        category: "MIGRATION",
        priority: "MEDIUM",
        status: "WAITING_CLIENT",
        subject: "Consulta sobre mapeo de columnas en archivo CSV de inventario",
        description: "Tengo un archivo con 400 productos pero la columna de código de barras no se auto-detecta en el importador.",
        telemetry: {
          browser: "Safari 17.2 macOS",
          os: "macOS Sonoma",
          screen_res: "1440x900",
          app_version: "Orbítica POS v2.4.0",
          current_route: "/migration",
        },
        messages: [
          {
            id: "msg_2",
            sender_type: "CLIENT",
            sender_name: "Elena Vargas",
            message: "Tengo un archivo con 400 productos pero la columna de código de barras no se auto-detecta en el importador.",
            created_at: "2026-08-31 11:15",
          },
          {
            id: "msg_3",
            sender_type: "SUPPORT_AGENT",
            sender_name: "Soporte Especializado Orbítica",
            message: "Hola Elena. Puedes asignar la columna 'Código' directamente a 'Código de Barras (Barcode)' desde el selector desplegable antes de importar.",
            created_at: "2026-08-31 11:30",
          },
        ],
        created_at: "2026-08-31 11:15",
        updated_at: "2026-08-31 11:30",
      },
    ];

    if (status && status !== "ALL") {
      tickets = tickets.filter((t) => t.status === status);
    }
    if (category && category !== "ALL") {
      tickets = tickets.filter((t) => t.category === category);
    }
    if (priority && priority !== "ALL") {
      tickets = tickets.filter((t) => t.priority === priority);
    }
    if (search) {
      tickets = tickets.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(search) ||
          t.subject.toLowerCase().includes(search) ||
          t.organization_name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        total: tickets.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);
    const body = await request.json();
    const { organization_id, organization_name, category, priority, subject, description, telemetry } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Asunto y descripción son obligatorios" } },
        { status: 400 }
      );
    }

    const newTicket: SupportTicket = {
      id: `tick_${Date.now()}`,
      ticket_number: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
      organization_id: organization_id || user.organization_id || "org_demo",
      organization_name: organization_name || user.organization_name || "Mi Negocio",
      created_by_name: user.full_name,
      created_by_email: user.email,
      category: category || "OTHER",
      priority: priority || "NORMAL",
      status: "OPEN",
      subject: subject.trim(),
      description: description.trim(),
      telemetry: telemetry || {
        browser: "Web Client",
        os: "Windows / macOS",
        screen_res: "Desktop",
        app_version: "Orbítica POS v2.4.0",
        current_route: "/support",
      },
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender_type: "CLIENT",
          sender_name: user.full_name,
          message: description.trim(),
          created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
        },
      ],
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    };

    return NextResponse.json({
      success: true,
      data: newTicket,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}
