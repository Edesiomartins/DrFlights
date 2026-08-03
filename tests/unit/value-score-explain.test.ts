import { describe, expect, it } from "vitest";
import { buildItineraryHash } from "@/lib/flights/deduplication/itinerary-hash";
import {
  computeValueScore,
  explainBestValue,
  pickHighlights,
} from "@/lib/flights/ranking/value-score";
import type { NormalizedFlightOffer } from "@/lib/flights/types";

function makeOffer(
  overrides: Partial<NormalizedFlightOffer> & { id: string; totalAmount: number },
): NormalizedFlightOffer {
  const slices = [
    {
      origin: "GRU",
      destination: "GIG",
      departureAt: "2026-09-01T08:00:00",
      arrivalAt: "2026-09-01T09:15:00",
      durationMinutes: 75,
      stops: 0,
      stopAirports: [] as string[],
      segments: [
        {
          origin: "GRU",
          destination: "GIG",
          departureAt: "2026-09-01T08:00:00",
          arrivalAt: "2026-09-01T09:15:00",
          durationMinutes: 75,
          flightNumber: "LA3000",
          marketingCarrier: "LATAM",
          marketingCarrierCode: "LA",
        },
      ],
    },
  ];
  const cabin = overrides.cabin ?? "economy";
  return {
    provider: "duffel",
    providerOfferId: overrides.id,
    priceType: "cash",
    currency: "BRL",
    airlineName: "LATAM",
    airlineCode: "LA",
    operatingCarriers: ["LA"],
    cabin,
    slices,
    totalDurationMinutes: 75,
    totalStops: 0,
    observedAt: "2026-08-02T00:00:00Z",
    itineraryHash: buildItineraryHash(slices, cabin),
    ...overrides,
  };
}

describe("value score self-transfer + explain", () => {
  it("penalizes separate tickets / self-transfer", () => {
    const normal = makeOffer({ id: "n", totalAmount: 400 });
    const self = makeOffer({
      id: "s",
      totalAmount: 400,
      separateTickets: true,
    });
    const scoreNormal = computeValueScore(normal, 400, 75);
    const scoreSelf = computeValueScore(self, 400, 75);
    expect(scoreSelf).toBeGreaterThan(scoreNormal);
  });

  it("explains best value reasons", () => {
    const offers = [
      makeOffer({
        id: "a",
        totalAmount: 350,
        baggage: { checked: "1pc", carryOn: "1pc" },
        refundable: true,
      }),
      makeOffer({ id: "b", totalAmount: 500, totalDurationMinutes: 200, totalStops: 1 }),
    ];
    const highlights = pickHighlights(offers);
    expect(highlights.bestValueId).toBeTruthy();
    expect(highlights.bestValueReasons?.length).toBeGreaterThan(0);
    const best = offers.find((o) => o.id === highlights.bestValueId)!;
    const reasons = explainBestValue(best, offers);
    expect(reasons.some((r) => /preço|direto|bagagem|self-transfer|duração/i.test(r))).toBe(
      true,
    );
  });
});
