import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("orbitica_session_user");
    let user = null;

    if (existingCookie?.value) {
      try {
        const saved = JSON.parse(existingCookie.value);
        if (saved.email?.toLowerCase() === email?.toLowerCase()) {
          user = saved;
        }
      } catch (e) {}
    }

    if (!user && email && password) {
      const emailLower = email.toLowerCase();
      if (emailLower === "superadmin@orbitica.cr") {
        user = {
          id: "usr_superadmin_001",
          organization_id: "org_orbitica_hq",
          organization_name: "ORBÍTICA STUDIO HQ",
          legal_name: "Orbítica Studio Costa Rica S.A.",
          identification_number: "3101999888",
          branch_id: "br_hq_001",
          branch_name: "Sede Principal",
          email: emailLower,
          full_name: "Superadmin Orbítica",
          role: "superadmin",
          permissions: ["*"],
        };
      } else {
        const namePart = emailLower.split("@")[0].replace(".", " ");
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        user = {
          id: `usr_${Date.now()}`,
          organization_id: `org_${Date.now()}`,
          organization_name: "Mi Negocio",
          legal_name: "Comercial S.A.",
          identification_number: "3101000000",
          branch_id: "br_001",
          branch_name: "Sucursal Central (001)",
          email: emailLower,
          full_name: formattedName,
          role: "owner",
          permissions: ["*"],
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Credenciales inválidas" } },
        { status: 401 }
      );
    }

    const token = `orbitica_jwt_${user.id}_${Date.now()}`;
    cookieStore.set("orbitica_session_user", JSON.stringify(user), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      data: {
        access_token: token,
        token_type: "bearer",
        expires_in: 604800,
        user,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Error del servidor" } },
      { status: 500 }
    );
  }
}