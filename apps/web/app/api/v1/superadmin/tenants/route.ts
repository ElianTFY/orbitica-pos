import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
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
        { success: false, error: { code: "FORBIDDEN", message: "Acceso denegado" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, tenant_id, data, step_up_token, reason } = body;

    if (!action || !tenant_id) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAMS", message: "Acción y tenant_id requeridos" } },
        { status: 400 }
      );
    }

    // Critical actions require step-up token and explicit reason
    if (["DELETE_TENANT", "SUSPEND_TENANT", "GLOBAL_LIMIT_OVERRIDE"].includes(action)) {
      if (!step_up_token || !reason) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "STEP_UP_REQUIRED",
              message: "Esta acción crítica requiere reautenticación y motivo documentado",
            },
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        tenant_id,
        processed_at: new Date().toISOString(),
        executed_by: user.email,
        details: data || {},
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Error administrativo" } },
      { status: 500 }
    );
  }
}
