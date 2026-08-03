import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { normalizeIgnavItineraries } from "@/lib/flights/normalization/ignav";
import type {
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderHealthResult,
} from "@/lib/flights/types";
import { getEnv } from "@/lib/utils/env";

export class IgnavProvider extends BaseFlightProvider {
  readonly id = "ignav";
  readonly name = "Ignav";

  get configured(): boolean {
    return Boolean(getEnv("IGNAV_API_KEY"));
  }

  protected async executeSearch(
    input: FlightSearchInput,
    signal: AbortSignal,
  ): Promise<NormalizedFlightOffer[]> {
    const apiKey = getEnv("IGNAV_API_KEY");
    if (!apiKey) return [];

    if (input.tripType === "multi_city") {
      // Ignav REST API documents one-way and round-trip only.
      return [];
    }

    const first = input.slices[0];
    if (!first) return [];

    const isRoundTrip = input.tripType === "round_trip";
    const endpoint = isRoundTrip
      ? "https://ignav.com/api/fares/round-trip"
      : "https://ignav.com/api/fares/one-way";

    const body: Record<string, unknown> = {
      origin: first.origin,
      destination: first.destination,
      departure_date: first.departureDate,
      adults: input.adults,
      children: input.children,
      cabin_class: input.cabin,
      market: input.market ?? "BR",
    };

    if (input.maxStops != null) body.max_stops = input.maxStops;
    if (isRoundTrip) {
      const ret = input.slices[1];
      if (!ret) return [];
      body.return_date = ret.departureDate;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ignav HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      itineraries?: unknown[];
      data?: unknown[];
      results?: unknown[];
    };
    const items = json.itineraries ?? json.data ?? json.results ?? [];
    return normalizeIgnavItineraries(Array.isArray(items) ? items : []);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const configured = this.configured;
    if (!configured) {
      return {
        provider: this.id,
        configured: false,
        enabled: false,
        ok: false,
        message: "IGNAV_API_KEY não configurada.",
      };
    }

    const started = Date.now();
    try {
      const response = await fetch("https://ignav.com/api/airports?q=GRU&limit=1", {
        headers: { "X-Api-Key": getEnv("IGNAV_API_KEY") },
        signal: AbortSignal.timeout(8000),
      });
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: response.ok,
        latencyMs: Date.now() - started,
        message: response.ok ? "Ignav responsivo." : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: false,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : "Falha no healthcheck",
      };
    }
  }
}
