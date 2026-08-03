import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getFlightProviders } from "@/lib/flights/providers/registry";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const providers = getFlightProviders();
  const results = await Promise.all(providers.map((p) => p.healthCheck()));

  for (const result of results) {
    await prisma.providerStatus.upsert({
      where: { provider: result.provider },
      create: {
        provider: result.provider,
        enabled: result.enabled,
        lastStatus: result.ok ? "success" : "error",
        lastLatencyMs: result.latencyMs,
        lastSuccessAt: result.ok ? new Date() : undefined,
        lastFailureAt: result.ok ? undefined : new Date(),
        lastError: result.ok ? null : result.message,
      },
      update: {
        enabled: result.enabled,
        lastStatus: result.ok ? "success" : "error",
        lastLatencyMs: result.latencyMs,
        lastSuccessAt: result.ok ? new Date() : undefined,
        lastFailureAt: result.ok ? undefined : new Date(),
        lastError: result.ok ? null : result.message,
      },
    });
  }

  return NextResponse.json({ results });
}
