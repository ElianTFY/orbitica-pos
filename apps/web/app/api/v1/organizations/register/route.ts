import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      legal_name,
      trade_name,
      identification_type,
      identification_number,
      owner_email,
      owner_password,
      owner_full_name,
      initial_branch_name,
    } = body;

    const orgId = `org_${Date.now()}`;
    const userId = `usr_${Date.now()}`;
    const branchId = `br_001`;

    const newUser = {
      id: userId,
      organization_id: orgId,
      organization_name: trade_name || legal_name || "Mi Negocio",
      branch_id: branchId,
      email: owner_email.toLowerCase(),
      full_name: owner_full_name || "Propietario",
      role: "owner",
      permissions: ["*"],
    };

    const cookieStore = await cookies();
    cookieStore.set("orbitica_session_user", JSON.stringify(newUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      message: "Organización y usuario aprovisionados exitosamente en Orbítica POS",
      data: {
        organization_id: orgId,
        owner_user_id: userId,
        branch_id: branchId,
        trial_days: 14,
        country: "CR",
        currency: "CRC",
        user: newUser,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "REGISTRATION_FAILED", message: error?.message || "Error al registrar" } },
      { status: 400 }
    );
  }
}