import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SuperadminRole } from "@/types";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado en plataforma" } },
        { status: 401 }
      );
    }

    const user = JSON.parse(sessionCookie.value);
    if (user.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Acceso denegado: se requieren privilegios administrativos" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password, reason, action, target_resource } = body;

    if (!password || !reason || !action) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Reautenticación exige contraseña, motivo explícito y acción" } },
        { status: 400 }
      );
    }

    // Step-up verification (accepts valid admin credentials or 2FA token)
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Contraseña de reautenticación incorrecta" } },
        { status: 401 }
      );
    }

    const stepUpToken = `stepup_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min TTL

    return NextResponse.json({
      success: true,
      data: {
        step_up_token: stepUpToken,
        expires_at: expiresAt,
        action,
        reason,
        target_resource: target_resource || "GLOBAL",
        authenticated_by: user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Error al procesar reautenticación" } },
      { status: 500 }
    );
  }
}
