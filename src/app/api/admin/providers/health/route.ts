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
    if (!result.configured) {
      // Unconfigured: not a failure — keep circuit closed and disable the source.
      recordProviderSuccess(result.provider);
      await prisma.providerStatus.upsert({
        where: { provider: result.provider },
        create: {
          provider: result.provider,
          enabled: false,
          lastStatus: "disabled",
          lastLatencyMs: null,
          lastError: result.message,
          consecutiveFailures: 0,
          circuitState: "closed",
          circuitOpenedAt: null,
        },
        update: {
          enabled: false,
          lastStatus: "disabled",
          lastLatencyMs: null,
          lastError: result.message,
          consecutiveFailures: 0,
          circuitState: "closed",
          circuitOpenedAt: null,
          lastFailureAt: null,
        },
      });
      continue;
    }

    if (result.ok) {
      recordProviderSuccess(result.provider);
    } else {
      recordProviderFailure(result.provider);
    }

    const circuit = circuitFieldsForPersist(result.provider);
    await prisma.providerStatus.upsert({
      where: { provider: result.provider },
      create: {
        provider: result.provider,
        enabled: true,
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
        enabled: true,
        lastStatus: result.ok ? "success" : "error",
        lastLatencyMs: result.latencyMs ?? null,
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
