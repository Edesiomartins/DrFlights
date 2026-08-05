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

export function getDuffelApiKey(): string | undefined {
  return read("DUFFEL_API_KEY") ?? read("DUFFEL_API_KEY_LIVE");
}

export function getTravelpayoutsToken(): string | undefined { return read("TRAVELPAYOUTS_TOKEN"); }
export function getTravelpayoutsMarker(): string | undefined { return read("TRAVELPAYOUTS_MARKER"); }
export function getAmadeusClientId(): string | undefined { return read("AMADEUS_CLIENT_ID"); }
export function getAmadeusClientSecret(): string | undefined { return read("AMADEUS_CLIENT_SECRET"); }
export function getAmadeusBaseUrl(): string { return read("AMADEUS_BASE_URL") ?? "https://test.api.amadeus.com"; }
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
