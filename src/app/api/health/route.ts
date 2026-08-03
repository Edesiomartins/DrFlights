import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getFlightProviders } from "@/lib/flights/providers/registry";
import { getAppVersion, isSmtpConfigured } from "@/lib/utils/env";

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const providers = getFlightProviders().map((p) => ({
    id: p.id,
    name: p.name,
    configured: p.enabled,
    status: p.enabled ? "configured" : "disabled",
  }));

  const overall =
    database === "ok" ? "ok" : "degraded";

  return NextResponse.json({
    status: overall,
    version: getAppVersion(),
    time: new Date().toISOString(),
    database,
    smtpConfigured: isSmtpConfigured(),
    providers,
    configuredProviders: providers.filter((p) => p.configured).map((p) => p.id),
    disabledProviders: providers.filter((p) => !p.configured).map((p) => p.id),
  });
}
