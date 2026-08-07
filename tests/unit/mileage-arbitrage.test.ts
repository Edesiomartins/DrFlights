import { describe, expect, it } from "vitest";
import { computeMileageArbitrage, getMilheiroCost } from "@/lib/flights/mileage/mileage-arbitrage";
import type { NormalizedFlightOffer } from "@/lib/flights/types";

describe("mileage-arbitrage", () => {
  it("resolves default program milheiro costs correctly", () => {
    expect(getMilheiroCost("Smiles")).toBe(15.5);
    expect(getMilheiroCost("LATAM Pass")).toBe(24.0);
    expect(getMilheiroCost("Unknown Program")).toBe(20.0);
  });

  it("calculates CPM and recommends points when points cost is significantly lower", () => {
    const offer: NormalizedFlightOffer = {
      id: "test-pts",
      provider: "ignav",
      providerOfferId: "off-1",
      priceType: "points",
      pointsAmount: 20000,
      pointsProgram: "Smiles",
      taxesAmount: 100,
      taxesCurrency: "BRL",
      airlineName: "GOL",
      operatingCarriers: ["G3"],
      cabin: "economy",
      slices: [],
      totalDurationMinutes: 120,
      totalStops: 0,
      observedAt: new Date().toISOString(),
      itineraryHash: "hash-1",
    };

    // Cash equivalent: (20,000 / 1000) * 15.5 + 100 = 410 BRL
    // Cash price reference: 900 BRL
    const arbitrage = computeMileageArbitrage(offer, 900, 0);

    expect(arbitrage).toBeDefined();
    expect(arbitrage?.cpm).toBe(40); // (900-100)/20 = 40 BRL por milheiro
    expect(arbitrage?.cashEquivalent).toBe(410);
    expect(arbitrage?.recommendation).toBe("EMITIR EM MILHAS");
    expect(arbitrage?.savingsPercent).toBe(54);
  });
});
