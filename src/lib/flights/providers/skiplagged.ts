import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { callMcpTool } from "@/lib/flights/mcp/client";
import { normalizeSkiplaggedPayload } from "@/lib/flights/normalization/skiplagged";
import type {
  CabinClass,
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderHealthResult,
} from "@/lib/flights/types";

const SKIPLAGGED_MCP = "https://mcp.skiplagged.com/mcp";

function toSkiplaggedCabin(cabin: CabinClass): string {
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

function toMaxStops(maxStops?: number): string | undefined {
  if (maxStops == null) return undefined;
  if (maxStops <= 0) return "none";
  if (maxStops === 1) return "one";
  return "many";
}

/**
 * Free Skiplagged source via public MCP HTTP endpoint (no API key).
 * Includes standard, hidden-city and virtual-interlining options when available.
 */
export class SkiplaggedProvider extends BaseFlightProvider {
  readonly id = "skiplagged";
  readonly name = "Skiplagged";

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
      origin: first.origin,
      destination: first.destination,
      departureDate: first.departureDate,
      adults: input.adults,
      children: input.children,
      infantsLap: input.infants,
      fareClass: toSkiplaggedCabin(input.cabin),
      limit: 20,
      sort: "price",
      includeHiddenCity: true,
      includeVirtualInterlining: true,
      includeStandard: true,
      renderMode: "text",
    };

    if (input.tripType === "round_trip" && input.slices[1]) {
      args.returnDate = input.slices[1].departureDate;
    }

    const maxStops = toMaxStops(input.maxStops);
    if (maxStops) args.maxStops = maxStops;

    const payload = await callMcpTool(
      SKIPLAGGED_MCP,
      "sk_flights_search",
      args,
      signal,
    );

    if (payload && typeof payload === "object" && "rawText" in payload) {
      // Text-only responses without parseable JSON — no invented offers.
      return [];
    }

    return normalizeSkiplaggedPayload(payload);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const started = Date.now();
    try {
      const response = await fetch(SKIPLAGGED_MCP, {
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
          ? "Skiplagged MCP responsivo."
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
