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

    return NextResponse.json({
      success: true,
      data: {
        audit_records_available: true,
        append_only: true,
        immutable: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
