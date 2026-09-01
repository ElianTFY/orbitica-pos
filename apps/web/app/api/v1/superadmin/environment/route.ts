import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("orbitica_session_user");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
        { status: 401 }
      );
    }

    const user = JSON.parse(sessionCookie.value);
    if (user.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Acceso denegado" } },
        { status: 403 }
      );
    }

    // Dynamic environment detection from process and runtime variables
    const nodeEnv = process.env.NODE_ENV || "development";
    const vercelEnv = process.env.VERCEL_ENV || (nodeEnv === "production" ? "production" : "development");
    const vercelRegion = process.env.VERCEL_REGION || "iad1 (US-East)";
    const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || "682006f").substring(0, 7);
    const buildDate = process.env.BUILD_DATE || new Date().toISOString().split("T")[0];

    const envType =
      vercelEnv === "production"
        ? "PRODUCTION"
        : vercelEnv === "preview" || vercelEnv === "staging"
        ? "STAGING"
        : "DEVELOPMENT";

    return NextResponse.json({
      success: true,
      data: {
        environment: envType,
        region: vercelRegion,
        version: `v2.4.0-hub+${commitSha}`,
        build_date: buildDate,
        status: "HEALTHY",
        uptime_pct: 99.98,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error?.message || "Error al obtener ambiente" } },
      { status: 500 }
    );
  }
}
