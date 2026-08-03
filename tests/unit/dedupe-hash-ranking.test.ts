import { describe, expect, it } from "vitest";
import { dedupeOffers } from "@/lib/flights/deduplication/dedupe";
import { buildItineraryHash } from "@/lib/flights/deduplication/itinerary-hash";
import { computeValueScore, rankOffers } from "@/lib/flights/ranking/value-score";
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

describe("itineraryHash + dedupe + ranking", () => {
  it("builds stable itinerary hash", () => {
    const a = makeOffer({ id: "a", totalAmount: 100 });
    const b = makeOffer({ id: "b", totalAmount: 90, provider: "ignav" });
    expect(a.itineraryHash).toBe(b.itineraryHash);
  });

  it("groups duplicates and keeps cheapest as best", () => {
    const offers = [
      makeOffer({ id: "a", totalAmount: 200, refundable: true }),
      makeOffer({ id: "b", totalAmount: 150, provider: "ignav", refundable: false }),
    ];
    const groups = dedupeOffers(offers);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.bestOffer.totalAmount).toBe(150);
    expect(groups[0]!.alternatives).toHaveLength(1);
  });

  it("ranks by value score", () => {
    const cheapLong = makeOffer({
      id: "cheap",
      totalAmount: 100,
      totalDurationMinutes: 300,
    });
    cheapLong.slices[0]!.durationMinutes = 300;
    const fairFast = makeOffer({
      id: "fair",
      totalAmount: 140,
      totalDurationMinutes: 75,
      baggage: { checked: "1 despachada" },
      changeable: true,
    });
    const ranked = rankOffers([cheapLong, fairFast], "value");
    expect(ranked[0]?.id).toBeDefined();
    const scoreCheap = computeValueScore(cheapLong, 120, 150);
    const scoreFair = computeValueScore(fairFast, 120, 150);
    expect(typeof scoreCheap).toBe("number");
    expect(typeof scoreFair).toBe("number");
  });
});
