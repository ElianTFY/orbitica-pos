import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const notifications = [
      {
        id: "notif_1",
        title: "Pago de suscripción exitoso",
        message: "Supermercado San Pedro renovó su plan Escala por ₡27.900.",
        severity: "INFO",
        org_name: "Supermercado San Pedro",
        created_at: "Hace 10 min",
        is_read: false,
        deep_link: "/superadmin?tab=subscriptions",
      },
      {
        id: "notif_2",
        title: "Nuevo ticket urgente recibido",
        message: "Soda El Parque reporta error de autenticación con Ministerio de Hacienda ATV.",
        severity: "CRITICAL",
        org_name: "Soda El Parque",
        created_at: "Hace 25 min",
        is_read: false,
        deep_link: "/superadmin?tab=support",
      },
      {
        id: "notif_3",
        title: "Período de prueba por vencer",
        message: "Boutique Glamour Escazú tiene 2 días restantes en su prueba gratuita Crece.",
        severity: "WARNING",
        org_name: "Boutique Glamour Escazú",
        created_at: "Hace 2 horas",
        is_read: true,
        deep_link: "/superadmin?tab=tenants",
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unread_count: notifications.filter((n) => !n.is_read).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, notification_id } = body;

    return NextResponse.json({
      success: true,
      data: {
        action: action || "MARK_READ",
        notification_id,
        processed_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}
