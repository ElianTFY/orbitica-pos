import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("orbitica_session_user");
  return NextResponse.json({ success: true, message: "Sesión cerrada correctamente" });
}