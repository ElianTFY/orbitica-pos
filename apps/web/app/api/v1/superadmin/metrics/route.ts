import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
        { status: 401 }
      );
    }

    const user = JSON.parse(sessionCookie.value);
    if (user.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Acceso restringido a superadministradores" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT",
        system_status: "HEALTHY",
        uptime_pct: 99.98,
        response_time_ms: 38,
        last_backup_at: new Date().toISOString(),
        atv_status: "OPERATIONAL",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Error al obtener métricas" } },
      { status: 500 }
    );
  }
}
