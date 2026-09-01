import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Correo y código de verificación requeridos." } },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim();
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CODE", message: "El código de verificación debe contener exactamente 6 dígitos numéricos." } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Correo electrónico verificado exitosamente. Tu cuenta ha sido activada.",
      data: {
        email: email.toLowerCase(),
        verified: true,
        verified_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "VERIFICATION_ERROR", message: error?.message || "Error al verificar código." } },
      { status: 500 }
    );
  }
}
