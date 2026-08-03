import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  circuitFieldsForPersist,
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/flights/providers/circuit-breaker";
import { getFlightProviders } from "@/lib/flights/providers/registry";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const providers = getFlightProviders();
  const results = await Promise.all(providers.map((p) => p.healthCheck()));

  for (const result of results) {
    if (result.ok) recordProviderSuccess(result.provider);
    else if (result.configured) recordProviderFailure(result.provider);
    const circuit = circuitFieldsForPersist(result.provider);

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
        consecutiveFailures: circuit.consecutiveFailures,
        circuitState: circuit.circuitState,
        circuitOpenedAt: circuit.circuitOpenedAt,
      },
      update: {
        enabled: result.enabled,
        lastStatus: result.ok ? "success" : "error",
        lastLatencyMs: result.latencyMs,
        lastSuccessAt: result.ok ? new Date() : undefined,
        lastFailureAt: result.ok ? undefined : new Date(),
        lastError: result.ok ? null : result.message,
        consecutiveFailures: circuit.consecutiveFailures,
        circuitState: circuit.circuitState,
        circuitOpenedAt: circuit.circuitOpenedAt,
      },
    });
  }

  return NextResponse.json({ results });
}
