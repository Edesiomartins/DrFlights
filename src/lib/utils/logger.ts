type LogLevel = "info" | "warn" | "error" | "debug";

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1[REDACTED]")
      .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s]+/gi, "$1[REDACTED]")
      .replace(
        /([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})/gi,
        "[REDACTED_EMAIL]",
      )
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[REDACTED_CPF]");
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (
        /password|secret|token|authorization|api.?key|email|cpf|cookie/i.test(k)
      ) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitize(v);
      }
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta: sanitize(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") write("debug", message, meta);
  },
};
