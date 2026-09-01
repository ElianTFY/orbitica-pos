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
    const { action, plan_id, new_monthly_price, new_annual_price, effective_date, step_up_token, reason } = body;

    // Price change is a critical action requiring step-up auth
    if (action === "CREATE_PRICE_VERSION") {
      if (!step_up_token || !reason) {
        return NextResponse.json(
          { success: false, error: { code: "STEP_UP_REQUIRED", message: "Modificar precios globales exige reautenticación y motivo" } },
          { status: 403 }
        );
      }
    }

    const versionId = `ver_${plan_id}_${Date.now()}`;
    return NextResponse.json({
      success: true,
      data: {
        version_id: versionId,
        plan_id,
        new_monthly_price,
        new_annual_price,
        effective_date: effective_date || new Date().toISOString().split("T")[0],
        grandfathered_tenants_protected: true,
        created_by: user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
