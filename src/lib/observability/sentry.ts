import { getEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { reportMonitoringEvent } from "@/lib/monitoring";

/**
 * Lightweight Sentry-compatible error reporter (no heavy SDK).
 * Posts to the store endpoint derived from SENTRY_DSN when configured.
 */
function parseDsn(dsn: string): {
  publicKey: string;
  host: string;
  projectId: string;
} | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "").split("/")[0];
    if (!publicKey || !projectId) return null;
    return { publicKey, host: url.host, projectId };
  } catch {
    return null;
  }
}

export function getSentryDsn(): string | undefined {
  return getEnv("SENTRY_DSN") || getEnv("NEXT_PUBLIC_SENTRY_DSN") || undefined;
}

export function isSentryConfigured(): boolean {
  return Boolean(getSentryDsn() && parseDsn(getSentryDsn()!));
}

export function reportSentryException(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, string | number | boolean | null>;
  },
): void {
  const dsn = getSentryDsn();
  if (!dsn) {
    reportMonitoringEvent({
      type: "unhandled_error",
      message: error instanceof Error ? error.message : String(error),
      tags: context?.tags,
    });
    return;
  }

  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");
  const stack = error instanceof Error ? error.stack : undefined;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    dsn,
    sent_at: new Date().toISOString(),
  });
  const itemHeader = JSON.stringify({ type: "event", content_type: "application/json" });
  const payload = JSON.stringify({
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    server_name: "drflights",
    environment: process.env.NODE_ENV ?? "production",
    tags: context?.tags,
    extra: context?.extra,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: message.slice(0, 500),
          stacktrace: stack
            ? {
                frames: stack
                  .split("\n")
                  .slice(1, 20)
                  .map((line) => ({ filename: line.trim(), function: "?" })),
              }
            : undefined,
        },
      ],
    },
  });

  const url = `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_version=7&sentry_key=${parsed.publicKey}`;
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: `${envelopeHeader}\n${itemHeader}\n${payload}`,
  }).catch((err) => {
    logger.debug("sentry.delivery_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  });
}
