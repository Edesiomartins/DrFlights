import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { assertTravelpayoutsQuota } from "@/lib/flights/providers/travelpayouts-quota";
import { normalizeTravelpayoutsPayload } from "@/lib/flights/normalization/travelpayouts";
import type {
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderHealthResult,
} from "@/lib/flights/types";
import {
  getTravelpayoutsMarker,
  getTravelpayoutsToken,
} from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

async function fetchPricesForDates(
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<unknown> {
  assertTravelpayoutsQuota();
  const response = await fetch(
    `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      logger.warn("travelpayouts.auth_unauthorized", {
        status: 401,
        message: "TRAVELPAYOUTS_TOKEN inválido ou não autorizado (HTTP 401).",
      });
      return { data: [] };
    }
    throw new Error(
      `Travelpayouts HTTP ${response.status}: ${text.slice(0, 160)}`,
    );
  }
  return response.json();
}

export class TravelpayoutsProvider extends BaseFlightProvider {
  readonly id = "travelpayouts";
  readonly name = "Travelpayouts / Aviasales";

  get configured() {
    return Boolean(getTravelpayoutsToken());
  }

  protected async executeSearch(
    input: FlightSearchInput,
    signal: AbortSignal,
  ): Promise<NormalizedFlightOffer[]> {
    if (input.tripType === "multi_city") {
      logger.info("travelpayouts.multi_city_unsupported", {
        slices: input.slices.length,
      });
      return [];
    }

    const first = input.slices[0];
    if (!first) return [];
    const token = getTravelpayoutsToken() ?? "";
    const marker = getTravelpayoutsMarker();

    if (input.tripType === "round_trip") {
      const ret = input.slices[1];
      if (!ret) return [];

      const outboundParams = new URLSearchParams({
        origin: first.origin,
        destination: first.destination,
        departure_at: first.departureDate,
        currency: "brl",
        sorting: "price",
        limit: "20",
        page: "1",
        one_way: "true",
        token,
      });
      const inboundParams = new URLSearchParams({
        origin: ret.origin,
        destination: ret.destination,
        departure_at: ret.departureDate,
        currency: "brl",
        sorting: "price",
        limit: "20",
        page: "1",
        one_way: "true",
        token,
      });

      // Also try native round-trip endpoint (return_at)
      const rtParams = new URLSearchParams({
        origin: first.origin,
        destination: first.destination,
        departure_at: first.departureDate,
        return_at: ret.departureDate,
        currency: "brl",
        sorting: "price",
        limit: "30",
        page: "1",
        one_way: "false",
        token,
      });

      const [rtRaw, outRaw, inRaw] = await Promise.all([
        fetchPricesForDates(rtParams, signal).catch(() => ({ data: [] })),
        fetchPricesForDates(outboundParams, signal),
        fetchPricesForDates(inboundParams, signal),
      ]);

      const rtOffers = normalizeTravelpayoutsPayload(rtRaw, input, marker);
      if (rtOffers.length > 0) return rtOffers;

      const outbound = normalizeTravelpayoutsPayload(
        outRaw,
        { ...input, tripType: "one_way", slices: [first] },
        marker,
      );
      const inbound = normalizeTravelpayoutsPayload(
        inRaw,
        { ...input, tripType: "one_way", slices: [ret] },
        marker,
      );

      return composeRoundTrip(outbound, inbound);
    }

    // one_way
    const params = new URLSearchParams({
      origin: first.origin,
      destination: first.destination,
      departure_at: first.departureDate,
      currency: "brl",
      sorting: "price",
      limit: "30",
      page: "1",
      one_way: "true",
      token,
    });
    const offers = normalizeTravelpayoutsPayload(
      await fetchPricesForDates(params, signal),
      input,
      marker,
    );
    if (offers.length > 0) return offers;

    assertTravelpayoutsQuota();
    const latestParams = new URLSearchParams({
      origin: first.origin,
      destination: first.destination,
      beginning_of_period: first.departureDate,
      period_type: "day",
      one_way: "true",
      limit: "30",
      currency: "brl",
      token,
    });
    const latest = await fetch(
      `https://api.travelpayouts.com/v2/prices/latest?${latestParams}`,
      { signal, headers: { Accept: "application/json" } },
    );
    if (!latest.ok) return [];
    return normalizeTravelpayoutsPayload(await latest.json(), input, marker);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const token = getTravelpayoutsToken();
    if (!token) {
      return {
        provider: this.id,
        configured: false,
        enabled: false,
        ok: false,
        message: "TRAVELPAYOUTS_TOKEN não configurado no .env.",
      };
    }

    try {
      const response = await fetch(
        `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=GRU&destination=GIG&currency=brl&token=${token}&limit=1`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (response.status === 401) {
        return {
          provider: this.id,
          configured: true,
          enabled: true,
          ok: false,
          message: "TRAVELPAYOUTS_TOKEN inválido ou não autorizado (HTTP 401). Verifique a chave no painel do Travelpayouts.",
        };
      }
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: response.ok,
        message: response.ok ? "Travelpayouts responsivo." : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        provider: this.id,
        configured: true,
        enabled: true,
        ok: false,
        message: err instanceof Error ? err.message : "Falha no healthcheck",
      };
    }
  }
}

function composeRoundTrip(
  outbound: NormalizedFlightOffer[],
  inbound: NormalizedFlightOffer[],
): NormalizedFlightOffer[] {
  const outTop = outbound
    .filter((o) => o.priceType === "cash" && o.totalAmount != null)
    .slice(0, 8);
  const inTop = inbound
    .filter((o) => o.priceType === "cash" && o.totalAmount != null)
    .slice(0, 8);
  const combined: NormalizedFlightOffer[] = [];

  for (const out of outTop) {
    for (const inn of inTop) {
      combined.push({
        ...out,
        id: `tp-rt-${out.id}-${inn.id}`,
        providerOfferId: `${out.providerOfferId}|${inn.providerOfferId}`,
        totalAmount: (out.totalAmount ?? 0) + (inn.totalAmount ?? 0),
        slices: [...out.slices, ...inn.slices],
        totalDurationMinutes:
          out.totalDurationMinutes + inn.totalDurationMinutes,
        totalStops: out.totalStops + inn.totalStops,
        separateTickets: true,
        airlineName:
          out.airlineCode === inn.airlineCode
            ? out.airlineName
            : `${out.airlineName} + ${inn.airlineName}`,
        operatingCarriers: [
          ...new Set([...out.operatingCarriers, ...inn.operatingCarriers]),
        ],
        bookingUrl: out.bookingUrl ?? inn.bookingUrl,
        itineraryHash: `${out.itineraryHash}:${inn.itineraryHash}`,
        observedAt: new Date().toISOString(),
      });
    }
  }
  return combined;
}
