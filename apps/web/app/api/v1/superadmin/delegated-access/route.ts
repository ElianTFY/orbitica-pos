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
    const body = await request.json();
    const { action, organization_id, reason, duration_minutes, grant_id } = body;

    const timestamp = new Date().toISOString();

    if (action === "REQUEST_ACCESS") {
      const minutes = duration_minutes || 30;
      const expires = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      return NextResponse.json({
        success: true,
        data: {
          grant_id: `grant_${Date.now()}`,
          organization_id,
          requested_by: user.email,
          reason,
          duration_minutes: minutes,
          permission_level: "READ_ONLY",
          status: "ACTIVE",
          expires_at: expires,
          created_at: timestamp,
          token: `sup_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        },
      });
    }

    if (action === "REVOKE_ACCESS") {
      return NextResponse.json({
        success: true,
        data: {
          grant_id,
          status: "REVOKED",
          revoked_at: timestamp,
          revoked_by: user.email,
        },
      });
    }

    return NextResponse.json({ success: false, error: { code: "INVALID_ACTION" } }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}
