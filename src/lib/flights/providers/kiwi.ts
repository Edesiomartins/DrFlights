import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { callMcpTool } from "@/lib/flights/mcp/client";
import { normalizeKiwiPayload } from "@/lib/flights/normalization/kiwi";
import type {
  CabinClass,
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderHealthResult,
} from "@/lib/flights/types";
import { getDefaultCurrency } from "@/lib/utils/env";

const KIWI_MCP = "https://mcp.kiwi.com";

function toKiwiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function toKiwiCabin(cabin: CabinClass): "M" | "W" | "C" | "F" {
  switch (cabin) {
    case "premium_economy":
      return "W";
    case "business":
      return "C";
    case "first":
      return "F";
    default:
      return "M";
  }
}

/** Free Kiwi.com source via public MCP HTTP endpoint (no API key). */
export class KiwiProvider extends BaseFlightProvider {
  readonly id = "kiwi";
  readonly name = "Kiwi.com";

  get configured(): boolean {
    return true;
  }

  protected async executeSearch(
    input: FlightSearchInput,
    signal: AbortSignal,
  ): Promise<NormalizedFlightOffer[]> {
    if (input.tripType === "multi_city") return [];

    const first = input.slices[0];
    if (!first) return [];

    const args: Record<string, unknown> = {
      flyFrom: first.origin,
      flyTo: first.destination,
      departureDate: toKiwiDate(first.departureDate),
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      cabinClass: toKiwiCabin(input.cabin),
      currency: (input.currency ?? getDefaultCurrency()).toLowerCase() === "brl"
        ? "BRL"
        : (input.currency ?? getDefaultCurrency()),
      sort: "price",
    };

    if (input.tripType === "round_trip" && input.slices[1]) {
      args.returnDate = toKiwiDate(input.slices[1].departureDate);
    }

    if (input.maxStops != null) {
      args.max_sector_stopovers = input.maxStops;
    }

    // Self-transfer / virtual interlining is useful for cheap fares but riskier.
    args.allow_self_transfer = true;

    const payload = await callMcpTool(KIWI_MCP, "search-flight", args, signal);
    return normalizeKiwiPayload(payload);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const started = Date.now();
    try {
      const response = await fetch(KIWI_MCP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "busca-aerea", version: "1.0.0" },
          },
        }),
        signal: AbortSignal.timeout(8000),
      });
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: response.ok,
        latencyMs: Date.now() - started,
        message: response.ok
          ? "Kiwi MCP responsivo."
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
