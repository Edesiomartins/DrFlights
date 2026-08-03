import { describe, expect, it, vi } from "vitest";
import type {
  FlightProvider,
  FlightSearchInput,
  ProviderHealthResult,
  ProviderSearchResult,
} from "@/lib/flights/types";

const sampleInput: FlightSearchInput = {
  tripType: "one_way",
  slices: [{ origin: "GRU", destination: "GIG", departureDate: "2026-09-01" }],
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "economy",
};

function makeProvider(
  id: string,
  impl: () => Promise<ProviderSearchResult>,
): FlightProvider {
  return {
    id,
    name: id,
    enabled: true,
    search: impl,
    healthCheck: async (): Promise<ProviderHealthResult> => ({
      provider: id,
      configured: true,
      enabled: true,
      ok: true,
      message: "ok",
    }),
  };
}

describe("provider resilience", () => {
  it("keeps successful providers when one fails via allSettled", async () => {
    const providers = [
      makeProvider("ok", async () => ({
        provider: "ok",
        status: "success",
        offers: [],
        durationMs: 10,
      })),
      makeProvider("bad", async () => {
        throw new Error("boom");
      }),
    ];

    const settled = await Promise.allSettled(
      providers.map((p) => p.search(sampleInput)),
    );

    expect(settled[0]?.status).toBe("fulfilled");
    expect(settled[1]?.status).toBe("rejected");
  });

  it("reports disabled when no providers are enabled", async () => {
    const disabled: FlightProvider = {
      id: "x",
      name: "x",
      enabled: false,
      search: async () => ({
        provider: "x",
        status: "disabled",
        offers: [],
        durationMs: 0,
        error: {
          code: "PROVIDER_DISABLED",
          message: "disabled",
          retryable: false,
        },
      }),
      healthCheck: async () => ({
        provider: "x",
        configured: false,
        enabled: false,
        ok: false,
        message: "disabled",
      }),
    };

    const result = await disabled.search(sampleInput);
    expect(result.status).toBe("disabled");
    expect(result.offers).toHaveLength(0);
  });

  it("does not invent offers on failure", async () => {
    const spy = vi.fn(async () => {
      throw new Error("timeout");
    });
    const provider = makeProvider("fail", spy);
    await expect(provider.search(sampleInput)).rejects.toThrow("timeout");
  });
});
