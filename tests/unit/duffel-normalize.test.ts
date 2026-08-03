import { describe, expect, it } from "vitest";
import { normalizeDuffelOffer } from "@/lib/flights/normalization/duffel";

const fixture = {
  id: "off_test_1",
  total_amount: "1234.56",
  total_currency: "BRL",
  tax_amount: "200.00",
  tax_currency: "BRL",
  expires_at: "2026-08-02T23:00:00Z",
  owner: { iata_code: "LA", name: "LATAM Airlines" },
  conditions: {
    refund_before_departure: { allowed: false },
    change_before_departure: { allowed: true },
  },
  slices: [
    {
      origin: { iata_code: "GRU" },
      destination: { iata_code: "GIG" },
      duration: "PT1H15M",
      segments: [
        {
          origin: { iata_code: "GRU" },
          destination: { iata_code: "GIG" },
          departing_at: "2026-09-01T08:00:00",
          arriving_at: "2026-09-01T09:15:00",
          duration: "PT1H15M",
          marketing_carrier: { iata_code: "LA", name: "LATAM Airlines" },
          marketing_carrier_flight_number: "3000",
          operating_carrier: { iata_code: "LA", name: "LATAM Airlines" },
          passengers: [
            {
              cabin_class: "economy",
              baggages: [
                { type: "carry_on", quantity: 1 },
                { type: "checked", quantity: 0 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("normalizeDuffelOffer", () => {
  it("maps cash offer fields", () => {
    const offer = normalizeDuffelOffer(fixture);
    expect(offer).not.toBeNull();
    expect(offer!.provider).toBe("duffel");
    expect(offer!.totalAmount).toBe(1234.56);
    expect(offer!.currency).toBe("BRL");
    expect(offer!.airlineCode).toBe("LA");
    expect(offer!.totalDurationMinutes).toBe(75);
    expect(offer!.totalStops).toBe(0);
    expect(offer!.changeable).toBe(true);
    expect(offer!.refundable).toBe(false);
    expect(offer!.baggage?.carryOn).toContain("1");
    expect(offer!.itineraryHash).toHaveLength(32);
    expect(offer!.slices[0]?.segments[0]?.flightNumber).toBe("LA3000");
  });
});
