import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_CREDENTIALS", message: "Debe ingresar correo y contraseña" } },
        { status: 400 }
      );
    }

    const emailLower = email.trim().toLowerCase();
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("orbitica_session_user");
    let user = null;

    if (existingCookie?.value) {
      try {
        const saved = JSON.parse(existingCookie.value);
        if (saved.email?.toLowerCase() === emailLower) {
          user = saved;
        }
      } catch (e) {}
    }

    // Platform Superadmin
    if (!user && emailLower === "superadmin@orbitica.cr") {
      user = {
        id: "usr_superadmin_001",
        organization_id: "org_orbitica_platform",
        organization_name: "ORBÍTICA PLATFORM",
        legal_name: "Orbítica Studio Costa Rica S.A.",
        identification_number: "3101999888",
        branch_id: "br_platform_001",
        branch_name: "Sede Principal",
        email: emailLower,
        full_name: "Superadministrador Orbítica",
        role: "superadmin",
        permissions: ["*"],
      };
    }

    // If not found in cookie, check if registered in persistent storage header or create clean owner profile
    if (!user) {
      const namePart = emailLower.split("@")[0].replace(/[._-]/g, " ");
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const orgId = `org_${Date.now()}`;
      user = {
        id: `usr_${Date.now()}`,
        organization_id: orgId,
        organization_name: `Empresa ${formattedName}`,
        legal_name: `Comercial ${formattedName} S.A.`,
        identification_number: "3101000000",
        identification_type: "JURIDICA",
        branch_id: "br_001",
        branch_name: "Sucursal Central (001)",
        email: emailLower,
        full_name: formattedName,
        phone: "+506 2200-0000",
        role: "owner",
        permissions: ["*"],
      };
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