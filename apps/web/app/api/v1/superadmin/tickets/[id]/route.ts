import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const user = JSON.parse(sessionCookie.value);
    const body = await request.json();
    const { action, message, is_internal_note, status, agent_name, team, reason } = body;

    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (action === "REPLY") {
      if (!message || !message.trim()) {
        return NextResponse.json({ success: false, error: { code: "MISSING_MESSAGE" } }, { status: 400 });
      }

      const newMsg = {
        id: `msg_${Date.now()}`,
        sender_type: user.role === "superadmin" ? "SUPPORT_AGENT" : "CLIENT",
        sender_name: user.role === "superadmin" ? "Especialista Orbítica Hub" : user.full_name,
        message: message.trim(),
        is_internal_note: Boolean(is_internal_note),
        created_at: timestamp,
      };

      return NextResponse.json({
        success: true,
        data: {
          ticket_id: id,
          action: "REPLY",
          message: newMsg,
          updated_status: is_internal_note ? "OPEN" : "WAITING_CLIENT",
          updated_at: timestamp,
        },
      });
    }

    if (action === "UPDATE_STATUS") {
      return NextResponse.json({
        success: true,
        data: {
          ticket_id: id,
          action: "UPDATE_STATUS",
          status,
          reason: reason || "Actualización por agente de soporte",
          updated_at: timestamp,
          updated_by: user.email,
        },
      });
    }

    if (action === "ASSIGN") {
      return NextResponse.json({
        success: true,
        data: {
          ticket_id: id,
          action: "ASSIGN",
          agent_name,
          updated_at: timestamp,
          updated_by: user.email,
        },
      });
    }

    if (action === "ESCALATE") {
      return NextResponse.json({
        success: true,
        data: {
          ticket_id: id,
          action: "ESCALATE",
          team,
          reason,
          updated_at: timestamp,
          updated_by: user.email,
        },
      });
    }

    return NextResponse.json({ success: false, error: { code: "INVALID_ACTION" } }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error?.message } }, { status: 500 });
  }
}
