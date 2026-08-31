import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEFAULT_USER = {
  id: "usr_owner_001",
  organization_id: "org_sanjose_001",
  organization_name: "Minimarket San José Express",
  branch_id: "br_central_001",
  email: "owner@sanjoseexpress.cr",
  full_name: "Carlos Morales V.",
  role: "owner",
  permissions: ["*"],
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    let user = DEFAULT_USER;
    if (sessionCookie?.value) {
      try {
        user = JSON.parse(sessionCookie.value);
      } catch (e) {
        user = DEFAULT_USER;
      }
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sesión no encontrada" } },
      { status: 401 }
    );
  }
}