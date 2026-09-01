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
    const { action, rule_id, is_enabled } = body;

    return NextResponse.json({
      success: true,
      data: {
        rule_id,
        is_enabled,
        updated_at: new Date().toISOString(),
        updated_by: user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
