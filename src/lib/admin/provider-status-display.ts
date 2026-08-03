import { CIRCUIT_BREAKER_CONFIG } from "@/lib/flights/providers/circuit-breaker";

export type ProviderStatusTone = "neutral" | "ok" | "danger" | "warn";

export type ProviderStatusCategory =
  | "operational"
  | "unconfigured"
  | "failed"
  | "paused";

export type ProviderStatusView = {
  label: string;
  tone: ProviderStatusTone;
  category: ProviderStatusCategory;
};

export type ProviderStatusRow = {
  provider: string;
  enabled: boolean;
  lastStatus: string | null;
  lastLatencyMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  consecutiveFailures?: number | null;
  circuitState?: string | null;
  circuitOpenedAt?: string | Date | null;
};

/** True when the stored error/message means missing API key, not a runtime failure. */
export function isMissingKeyMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return /não configurad|nao configurad|api[_-]?key|chave ausente|sem chave|não configurada|nao configurada/i.test(
    message,
  );
}

/**
 * Maps persisted ProviderStatus (+ circuit) into admin display states.
 * Priority: open circuit → unconfigured → operational → failed.
 */
export function classifyProviderStatus(
  row: Pick<ProviderStatusRow, "enabled" | "lastStatus" | "circuitState"> & {
    lastError?: string | null;
  },
): ProviderStatusView {
  if (row.circuitState === "open" || row.circuitState === "half_open") {
    return {
      label: "Pausado temporariamente",
      tone: "warn",
      category: "paused",
    };
  }

  if (
    !row.enabled ||
    row.lastStatus === "disabled" ||
    isMissingKeyMessage(row.lastError)
  ) {
    return {
      label: "Não configurado",
      tone: "neutral",
      category: "unconfigured",
    };
  }

  if (row.lastStatus === "success" || row.lastStatus === "partial") {
    return {
      label: "Operacional",
      tone: "ok",
      category: "operational",
    };
  }

  return {
    label: "Com falha",
    tone: "danger",
    category: "failed",
  };
}

export function unconfiguredDetail(
  provider: string,
  lastError: string | null | undefined,
): string {
  const base = lastError?.trim() || "Chave de API ausente no servidor.";
  if (provider === "duffel") {
    return `${base} Opcional no Brasil — a busca continua com Kiwi/Skiplagged.`;
  }
  if (provider === "ignav" || provider === "seats-aero") {
    return `${base} Fonte paga opcional.`;
  }
  return base;
}

export function summarizeProviderStatuses(rows: ProviderStatusRow[]): {
  operational: number;
  unconfigured: number;
  failed: number;
  paused: number;
} {
  const summary = {
    operational: 0,
    unconfigured: 0,
    failed: 0,
    paused: 0,
  };
  for (const row of rows) {
    summary[classifyProviderStatus(row).category] += 1;
  }
  return summary;
}

/** Approximate next probe time when the circuit is open. */
export function nextCircuitRetryAt(
  circuitOpenedAt: string | Date | null | undefined,
): Date | null {
  if (!circuitOpenedAt) return null;
  const opened =
    typeof circuitOpenedAt === "string"
      ? Date.parse(circuitOpenedAt)
      : circuitOpenedAt.getTime();
  if (!Number.isFinite(opened)) return null;
  return new Date(opened + CIRCUIT_BREAKER_CONFIG.openCooldownMs);
}

export function formatHealthResultLine(result: {
  provider: string;
  configured: boolean;
  ok: boolean;
  message: string;
  latencyMs?: number;
}): string {
  let status: string;
  if (!result.configured || isMissingKeyMessage(result.message)) {
    status = "não configurado";
  } else if (result.ok) {
    status = "operacional";
  } else {
    status = "com falha";
  }

  const latency = result.latencyMs != null ? `${result.latencyMs}ms` : "—";
  return `${result.provider}: ${status} (${latency}) — ${result.message}`;
}
