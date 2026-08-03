import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";

export type CircuitState = "closed" | "open" | "half_open";

type BreakerMemory = {
  consecutiveFailures: number;
  state: CircuitState;
  openedAt: number | null;
};

const FAILURE_THRESHOLD = 3;
/** How long the circuit stays open before a half-open probe. */
const OPEN_COOLDOWN_MS = 60_000;

const memory = new Map<string, BreakerMemory>();

function defaultState(): BreakerMemory {
  return { consecutiveFailures: 0, state: "closed", openedAt: null };
}

function getMemory(provider: string): BreakerMemory {
  const current = memory.get(provider);
  if (current) return current;
  const created = defaultState();
  memory.set(provider, created);
  return created;
}

/**
 * Returns true when the provider may be called.
 * Open circuits block until cooldown; then one half-open probe is allowed.
 */
export function canCallProvider(provider: string): boolean {
  const state = getMemory(provider);
  if (state.state === "closed") return true;
  if (state.state === "half_open") return true;

  const openedAt = state.openedAt ?? 0;
  if (Date.now() - openedAt >= OPEN_COOLDOWN_MS) {
    state.state = "half_open";
    memory.set(provider, state);
    return true;
  }
  return false;
}

export function getCircuitSnapshot(provider: string): BreakerMemory {
  return { ...getMemory(provider) };
}

export function recordProviderSuccess(provider: string): void {
  memory.set(provider, defaultState());
}

export function recordProviderFailure(provider: string): void {
  const state = getMemory(provider);
  if (state.state === "half_open") {
    state.consecutiveFailures = FAILURE_THRESHOLD;
    state.state = "open";
    state.openedAt = Date.now();
    memory.set(provider, state);
    return;
  }

  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.state = "open";
    state.openedAt = Date.now();
    logger.warn("provider.circuit.open", {
      provider,
      consecutiveFailures: state.consecutiveFailures,
      cooldownMs: OPEN_COOLDOWN_MS,
    });
  }
  memory.set(provider, state);
}

/** Hydrate in-memory breakers from ProviderStatus rows (best-effort). */
export async function hydrateCircuitBreakers(
  providerIds: string[],
): Promise<void> {
  try {
    const rows = await prisma.providerStatus.findMany({
      where: { provider: { in: providerIds } },
    });
    for (const row of rows) {
      const failures = row.consecutiveFailures ?? 0;
      let state = (row.circuitState as CircuitState) || "closed";
      const openedAt = row.circuitOpenedAt?.getTime() ?? null;

      if (state === "open" && openedAt != null) {
        if (Date.now() - openedAt >= OPEN_COOLDOWN_MS) {
          state = "half_open";
        }
      }

      memory.set(row.provider, {
        consecutiveFailures: failures,
        state:
          failures >= FAILURE_THRESHOLD && state === "closed" ? "open" : state,
        openedAt,
      });
    }
  } catch (error) {
    logger.warn("provider.circuit.hydrate_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function circuitFieldsForPersist(provider: string): {
  consecutiveFailures: number;
  circuitState: CircuitState;
  circuitOpenedAt: Date | null;
} {
  const state = getMemory(provider);
  return {
    consecutiveFailures: state.consecutiveFailures,
    circuitState: state.state,
    circuitOpenedAt: state.openedAt ? new Date(state.openedAt) : null,
  };
}

/** Test helper — clear memory between unit tests. */
export function resetCircuitBreakersForTests(): void {
  memory.clear();
}

/** Test helper — open a circuit with a custom openedAt timestamp. */
export function openCircuitForTests(provider: string, openedAt: number): void {
  memory.set(provider, {
    consecutiveFailures: FAILURE_THRESHOLD,
    state: "open",
    openedAt,
  });
}

export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: FAILURE_THRESHOLD,
  openCooldownMs: OPEN_COOLDOWN_MS,
} as const;
