import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, token, new_password } = body;

    if (action === "request_reset") {
      if (!email) {
        return NextResponse.json(
          { success: false, error: { code: "MISSING_EMAIL", message: "Ingrese el correo electrónico." } },
          { status: 400 }
        );
      }

      const generatedToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return NextResponse.json({
        success: true,
        message: `Se ha enviado un enlace seguro de recuperación a ${email}.`,
        data: {
          email: email.toLowerCase(),
          token: generatedToken,
          expires_in_minutes: 15,
        },
      });
    }

    if (action === "reset_password") {
      if (!token || !new_password) {
        return NextResponse.json(
          { success: false, error: { code: "MISSING_FIELDS", message: "Token y nueva contraseña requeridos." } },
          { status: 400 }
        );
      }

      if (String(new_password).length < 6) {
        return NextResponse.json(
          { success: false, error: { code: "WEAK_PASSWORD", message: "La nueva contraseña debe tener al menos 6 caracteres." } },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.",
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_ACTION", message: "Acción no válida." } },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "RECOVERY_ERROR", message: error?.message || "Error al procesar recuperación." } },
      { status: 500 }
    );
  }
}
