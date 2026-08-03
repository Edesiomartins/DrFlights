import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { normalizeDuffelOffers } from "@/lib/flights/normalization/duffel";
import type {
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderHealthResult,
} from "@/lib/flights/types";
import { getDuffelApiKey } from "@/lib/utils/env";

function buildPassengers(input: FlightSearchInput) {
  const passengers: Array<Record<string, unknown>> = [];
  for (let i = 0; i < input.adults; i++) {
    passengers.push({ type: "adult" });
  }
  for (let i = 0; i < input.children; i++) {
    passengers.push({ age: 10 });
  }
  for (let i = 0; i < input.infants; i++) {
    passengers.push({ type: "infant_without_seat" });
  }
  return passengers;
}

export class DuffelProvider extends BaseFlightProvider {
  readonly id = "duffel";
  readonly name = "Duffel";

  get configured(): boolean {
    return Boolean(getDuffelApiKey());
  }

  protected async executeSearch(
    input: FlightSearchInput,
    signal: AbortSignal,
  ): Promise<NormalizedFlightOffer[]> {
    const apiKey = getDuffelApiKey();
    if (!apiKey) return [];

    const body = {
      data: {
        slices: input.slices.map((s) => ({
          origin: s.origin,
          destination: s.destination,
          departure_date: s.departureDate,
        })),
        passengers: buildPassengers(input),
        cabin_class: input.cabin,
        ...(input.maxStops != null
          ? { max_connections: input.maxStops }
          : {}),
      },
    };

    const supplierTimeout = Math.min(this.timeoutMs, 60000);
    const url = `https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=${supplierTimeout}`;

    const response = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Duffel-Version": "v2",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Duffel HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      data?: { offers?: unknown[] };
    };
    return normalizeDuffelOffers(json.data?.offers ?? []);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const configured = this.configured;
    if (!configured) {
      return {
        provider: this.id,
        configured: false,
        enabled: false,
        ok: false,
        message: "DUFFEL_API_KEY / DUFFEL_API_KEY_LIVE não configurada.",
      };
    }

    const started = Date.now();
    try {
      const response = await fetch("https://api.duffel.com/air/airlines?limit=1", {
        headers: {
          Accept: "application/json",
          "Duffel-Version": "v2",
          Authorization: `Bearer ${getDuffelApiKey()}`,
        },
        signal: AbortSignal.timeout(8000),
      });
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: response.ok,
        latencyMs: Date.now() - started,
        message: response.ok
          ? "Duffel responsivo."
          : `HTTP ${response.status}`,
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
