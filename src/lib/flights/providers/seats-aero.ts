import { readFileSync } from "fs";
import path from "path";
import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { normalizeSeatsAeroAvailability } from "@/lib/flights/normalization/seats-aero";
import type {
  CabinClass,
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderHealthResult,
} from "@/lib/flights/types";
import { getEnv } from "@/lib/utils/env";

type TransferPartnersFile = {
  partners?: Record<
    string,
    { transfers_to?: Record<string, { ratio?: string }> }
  >;
};

type ValuationsFile = {
  airline_miles?: Record<string, { floor?: number; name?: string }>;
};

let transferCache: TransferPartnersFile | null = null;
let valuationCache: ValuationsFile | null = null;

function loadJson<T>(relativePath: string): T | null {
  try {
    const full = path.join(process.cwd(), relativePath);
    return JSON.parse(readFileSync(full, "utf8")) as T;
  } catch {
    return null;
  }
}

function enrichWithTransferAndCpp(
  offers: NormalizedFlightOffer[],
): NormalizedFlightOffer[] {
  if (!transferCache) {
    transferCache = loadJson<TransferPartnersFile>("data/transfer-partners.json");
  }
  if (!valuationCache) {
    valuationCache = loadJson<ValuationsFile>("data/points-valuations.json");
  }

  return offers.map((offer) => {
    const program = (offer.pointsProgram ?? "").toLowerCase();
    const transferPaths: string[] = [];
    const partners = transferCache?.partners ?? {};
    for (const [currency, info] of Object.entries(partners)) {
      const targets = info.transfers_to ?? {};
      for (const target of Object.keys(targets)) {
        if (target.toLowerCase().includes(program) || program.includes(target.toLowerCase())) {
          transferPaths.push(`${currency} → ${target}`);
        }
      }
    }

    const valuations = valuationCache?.airline_miles ?? {};
    let estimatedCpp: number | undefined;
    for (const [key, val] of Object.entries(valuations)) {
      if (key.toLowerCase().includes(program) || program.includes(key.toLowerCase())) {
        estimatedCpp = val.floor;
        break;
      }
    }

    return {
      ...offer,
      transferPaths: transferPaths.slice(0, 6),
      estimatedCpp,
    };
  });
}

export class SeatsAeroProvider extends BaseFlightProvider {
  readonly id = "seats-aero";
  readonly name = "Seats.aero";

  get configured(): boolean {
    return Boolean(getEnv("SEATS_AERO_API_KEY"));
  }

  protected async executeSearch(
    input: FlightSearchInput,
    signal: AbortSignal,
  ): Promise<NormalizedFlightOffer[]> {
    const apiKey = getEnv("SEATS_AERO_API_KEY");
    if (!apiKey) return [];

    const first = input.slices[0];
    if (!first) return [];

    const params = new URLSearchParams({
      origin_airport: first.origin,
      destination_airport: first.destination,
      start_date: first.departureDate,
      end_date: first.departureDate,
      cabins: mapCabin(input.cabin),
      take: "50",
      order_by: "lowest_mileage",
    });

    if (input.maxStops === 0) {
      params.set("only_direct_flights", "true");
    }

    const response = await fetch(
      `https://seats.aero/partnerapi/search?${params.toString()}`,
      {
        signal,
        headers: {
          "Partner-Authorization": apiKey,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Seats.aero HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      data?: unknown[];
      results?: unknown[];
    };
    const rows = json.data ?? json.results ?? [];
    const offers = (Array.isArray(rows) ? rows : []).flatMap((row) =>
      normalizeSeatsAeroAvailability(row, input.cabin),
    );
    return enrichWithTransferAndCpp(offers);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const configured = this.configured;
    if (!configured) {
      return {
        provider: this.id,
        configured: false,
        enabled: false,
        ok: false,
        message: "SEATS_AERO_API_KEY não configurada.",
      };
    }

    const started = Date.now();
    try {
      const response = await fetch(
        "https://seats.aero/partnerapi/search?origin_airport=GRU&destination_airport=GIG&take=1",
        {
          headers: {
            "Partner-Authorization": getEnv("SEATS_AERO_API_KEY"),
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: response.ok,
        latencyMs: Date.now() - started,
        message: response.ok
          ? "Seats.aero responsivo."
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

function mapCabin(cabin: CabinClass): string {
  switch (cabin) {
    case "premium_economy":
      return "premium";
    case "business":
      return "business";
    case "first":
      return "first";
    default:
      return "economy";
  }
}
