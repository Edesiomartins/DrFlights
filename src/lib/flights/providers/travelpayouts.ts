import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { normalizeTravelpayoutsPayload } from "@/lib/flights/normalization/travelpayouts";
import type { FlightSearchInput, NormalizedFlightOffer, ProviderHealthResult } from "@/lib/flights/types";
import { getTravelpayoutsMarker, getTravelpayoutsToken } from "@/lib/utils/env";

export class TravelpayoutsProvider extends BaseFlightProvider {
  readonly id = "travelpayouts"; readonly name = "Travelpayouts / Aviasales";
  get configured() { return Boolean(getTravelpayoutsToken()); }
  protected async executeSearch(input: FlightSearchInput, signal: AbortSignal): Promise<NormalizedFlightOffer[]> {
    if (input.tripType === "multi_city") return [];
    const first = input.slices[0]; if (!first) return [];
    const params = new URLSearchParams({ origin: first.origin, destination: first.destination, departure_at: first.departureDate, currency: "brl", sorting: "price", limit: "30", page: "1", one_way: String(input.tripType === "one_way"), token: getTravelpayoutsToken() ?? "" });
    const response = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Travelpayouts HTTP ${response.status}: ${(await response.text()).slice(0, 160)}`);
    const offers = normalizeTravelpayoutsPayload(await response.json(), input, getTravelpayoutsMarker());
    if (offers.length > 0) return offers;

    const latestParams = new URLSearchParams({ origin: first.origin, destination: first.destination, beginning_of_period: first.departureDate, period_type: "day", one_way: String(input.tripType === "one_way"), limit: "30", currency: "brl", token: getTravelpayoutsToken() ?? "" });
    const latest = await fetch(`https://api.travelpayouts.com/v2/prices/latest?${latestParams}`, { signal, headers: { Accept: "application/json" } });
    if (!latest.ok) return [];
    return normalizeTravelpayoutsPayload(await latest.json(), input, getTravelpayoutsMarker());
  }
  async healthCheck(): Promise<ProviderHealthResult> { return { provider: this.id, configured: this.configured, enabled: this.enabled, ok: this.configured, message: this.configured ? "Travelpayouts configurado." : "TRAVELPAYOUTS_TOKEN ausente." }; }
}
