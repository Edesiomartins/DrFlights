import { getMonitoringWebhookUrl } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type MonitoringEvent = {
  type:
    | "unhandled_error"
    | "search_latency"
    | "provider_latency"
    | "client_error";
  /** Wall-clock duration in ms when applicable */
  durationMs?: number;
  provider?: string;
  status?: string;
  message?: string;
  /** Non-PII tags only */
  tags?: Record<string, string | number | boolean | null | undefined>;
};

function monitoringEndpoint(): string | undefined {
  return getMonitoringWebhookUrl();
}

export function isMonitoringEnabled(): boolean {
  return Boolean(monitoringEndpoint());
}

function scrubTags(
  tags?: MonitoringEvent["tags"],
): Record<string, string | number | boolean | null> | undefined {
  if (!tags) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (/password|secret|token|authorization|api.?key|email|cookie/i.test(key)) {
      continue;
    }
    if (typeof value === "string" && value.length > 200) {
      out[key] = `${value.slice(0, 200)}…`;
    } else if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Fire-and-forget technical event. No-op when MONITORING_WEBHOOK_URL is empty.
 * Never send personal data or API keys.
 */
export function reportMonitoringEvent(event: MonitoringEvent): void {
  const endpoint = monitoringEndpoint();
  if (!endpoint) return;

  const payload = {
    source: "busca-aerea",
    time: new Date().toISOString(),
    type: event.type,
    durationMs: event.durationMs,
    provider: event.provider,
    status: event.status,
    message: event.message?.slice(0, 300),
    tags: scrubTags(event.tags),
  };

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((error) => {
    logger.debug("monitoring.delivery_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  });
}

export function reportUnhandledError(error: unknown, context?: string): void {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";
  reportMonitoringEvent({
    type: "unhandled_error",
    message,
    tags: { context: context ?? "server" },
  });
  // Lazy import to avoid circular deps in edge cases
  void import("@/lib/observability/sentry").then(({ reportSentryException }) => {
    reportSentryException(error, { tags: { context: context ?? "server" } });
  });
  logger.error("monitoring.unhandled_error", { message, context });
}
