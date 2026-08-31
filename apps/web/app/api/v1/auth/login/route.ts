import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEMO_USERS: Record<string, any> = {
  "owner@sanjoseexpress.cr": {
    id: "usr_owner_001",
    organization_id: "org_sanjose_001",
    organization_name: "Minimarket San José Express",
    branch_id: "br_central_001",
    email: "owner@sanjoseexpress.cr",
    full_name: "Carlos Morales V.",
    role: "owner",
    permissions: ["*"],
  },
  "cajero@sanjoseexpress.cr": {
    id: "usr_cashier_001",
    organization_id: "org_sanjose_001",
    organization_name: "Minimarket San José Express",
    branch_id: "br_central_001",
    email: "cajero@sanjoseexpress.cr",
    full_name: "Ana Salazar Chaves",
    role: "cajero",
    permissions: [
      "pos:read",
      "pos:sale",
      "pos:refund",
      "catalog:read",
      "inventory:read",
      "cash:open",
      "cash:close",
      "cash:count",
      "customer:create",
      "invoicing:read",
    ],
  },
  "superadmin@orbitica.cr": {
    id: "usr_superadmin_001",
    organization_id: "org_orbitica_hq",
    organization_name: "ORBÍTICA STUDIO HQ",
    branch_id: "br_hq_001",
    email: "superadmin@orbitica.cr",
    full_name: "Superadmin Orbítica",
    role: "superadmin",
    permissions: ["*"],
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    let user = DEMO_USERS[email?.toLowerCase()];

    // If not demo user, support any login for newly registered businesses
    if (!user && email && password) {
      const nameParts = email.split("@")[0].replace(".", " ");
      const formattedName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);
      user = {
        id: `usr_${Date.now()}`,
        organization_id: `org_${Date.now()}`,
        organization_name: "Mi Negocio Costa Rica",
        branch_id: `br_001`,
        email: email.toLowerCase(),
        full_name: formattedName || "Propietario",
        role: "owner",
        permissions: ["*"],
      };
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Credenciales inválidas" } },
        { status: 401 }
      );
    }

    const token = `orbitica_jwt_${user.id}_${Date.now()}`;
    const cookieStore = await cookies();
    cookieStore.set("orbitica_session_user", JSON.stringify(user), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
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