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
    const { title, message, target_audience, type } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Título y mensaje requeridos" } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        broadcast_id: `bcast_${Date.now()}`,
        title,
        message,
        target_audience: target_audience || "ALL",
        type: type || "GENERAL",
        sent_at: new Date().toISOString(),
        created_by: user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
