import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Sesión no encontrada" } },
        { status: 401 }
      );
    }

    const user = JSON.parse(sessionCookie.value);
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sesión inválida" } },
      { status: 401 }
    );
  }
}