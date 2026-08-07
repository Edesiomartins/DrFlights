function read(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

export function getEnv(name: string, fallback?: string): string {
  return read(name) ?? fallback ?? "";
}

export function requireEnv(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export function getTravelpayoutsToken(): string | undefined { return read("TRAVELPAYOUTS_TOKEN"); }
export function getTravelpayoutsMarker(): string | undefined { return read("TRAVELPAYOUTS_MARKER"); }
export function getTravelpayoutsRpm(): number {
  const raw = Number(read("TRAVELPAYOUTS_RPM") ?? "60");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60;
}

export function getTelegramBotToken(): string | undefined {
  return read("TELEGRAM_BOT_TOKEN");
}
export function getTelegramBotUsername(): string | undefined {
  const raw = read("TELEGRAM_BOT_USERNAME");
  return raw?.replace(/^@/, "");
}

export function getVapidPublicKey(): string | undefined {
  return read("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ?? read("VAPID_PUBLIC_KEY");
}
export function getVapidPrivateKey(): string | undefined {
  return read("VAPID_PRIVATE_KEY");
}
export function getVapidSubject(): string {
  return read("VAPID_SUBJECT") ?? "mailto:admin@example.com";
}

export function getSentryDsn(): string | undefined {
  return read("SENTRY_DSN") ?? read("NEXT_PUBLIC_SENTRY_DSN");
}
export function getDealMadK(): number {
  const raw = Number(read("DEAL_MAD_K") ?? "2.5");
  return Number.isFinite(raw) && raw > 0 ? raw : 2.5;
}
export function getPriceIntelMinSamples(): number {
  const raw = Number(read("PRICE_INTEL_MIN_SAMPLES") ?? "20");
  return Number.isFinite(raw) && raw >= 3 ? Math.floor(raw) : 20;
}

export function getProviderTimeoutMs(): number {
  const raw = Number(read("PROVIDER_TIMEOUT_MS") ?? "20000");
  return Number.isFinite(raw) && raw > 0 ? raw : 20000;
}

export function getSearchCacheTtlSeconds(): number {
  const raw = Number(read("SEARCH_CACHE_TTL_SECONDS") ?? "600");
  return Number.isFinite(raw) && raw > 0 ? raw : 600;
}

export function getDefaultCurrency(): string {
  return (read("DEFAULT_CURRENCY") ?? "BRL").toUpperCase();
}

export function getAppUrl(): string {
  return read("APP_URL") ?? "http://localhost:3000";
}

export function getAdminEmails(): Set<string> {
  const raw = read("ADMIN_EMAILS") ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSmtpConfigured(): boolean {
  return Boolean(read("SMTP_HOST") && read("SMTP_FROM"));
}

export function getAppName(): string {
  return read("NEXT_PUBLIC_APP_NAME") ?? "Busca Aérea";
}

export function getAppVersion(): string {
  return read("npm_package_version") ?? "1.0.0";
}

export function getMonitoringWebhookUrl(): string | undefined {
  return read("MONITORING_WEBHOOK_URL") ?? read("MONITORING_ENDPOINT");
}
