import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { action, flag_key, status, scope, rollout_percentage, step_up_token, reason } = body;

    // Global activation to 100% is a critical action
    if (action === "TOGGLE_FLAG" && status === "ACTIVE" && scope === "GLOBAL") {
      if (!step_up_token || !reason) {
        return NextResponse.json(
          { success: false, error: { code: "STEP_UP_REQUIRED", message: "Activar función globalmente exige reautenticación" } },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        flag_key,
        status,
        scope,
        rollout_percentage: rollout_percentage || 100,
        updated_at: new Date().toISOString(),
        updated_by: user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
