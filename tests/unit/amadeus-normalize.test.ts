import { describe, expect, it } from "vitest";
import { normalizeAmadeusPayload } from "@/lib/flights/normalization/amadeus";

describe("Amadeus normalization", () => {
  it("normalizes segments, stops, baggage and carrier dictionary", () => {
    const [offer] = normalizeAmadeusPayload({ dictionaries: { carriers: { LA: "LATAM" } }, data: [{ id: "A1", validatingAirlineCodes: ["LA"], price: { total: "812.50", currency: "BRL" }, itineraries: [{ duration: "PT2H30M", segments: [{ departure: { iataCode: "GRU", at: "2026-09-10T10:00:00" }, arrival: { iataCode: "BSB", at: "2026-09-10T11:30:00" }, carrierCode: "LA", number: "1", duration: "PT1H30M" }, { departure: { iataCode: "BSB", at: "2026-09-10T12:00:00" }, arrival: { iataCode: "GIG", at: "2026-09-10T13:00:00" }, carrierCode: "LA", number: "2", duration: "PT1H" }] }], travelerPricings: [{ fareDetailsBySegment: [{ cabin: "ECONOMY", includedCheckedBags: { quantity: 1 } }] }] }] });
    expect(offer).toMatchObject({ provider: "amadeus", totalAmount: 812.5, airlineName: "LATAM", totalStops: 1 });
    expect(offer?.baggage?.checked).toContain("1");
  });
});
