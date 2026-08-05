import { rateLimit } from "@/lib/security/rate-limit";
import { getEnv } from "@/lib/utils/env";

/**
 * In-process RPM gate for Travelpayouts. When exceeded, throw a retryable
 * rate-limit error so the circuit breaker can open — never fabricate offers.
 */
export function assertTravelpayoutsQuota(providerId = "travelpayouts"): void {
  const rpm = Number(getEnv("TRAVELPAYOUTS_RPM", "60"));
  const limit = Number.isFinite(rpm) && rpm > 0 ? Math.floor(rpm) : 60;
  const result = rateLimit(`provider-quota:${providerId}`, limit, 60_000);
  if (!result.allowed) {
    const err = new Error(
      `Travelpayouts rate limit (${limit}/min) atingido. Tente novamente em breve.`,
    );
    err.name = "RateLimitError";
    throw err;
  }
}
