import { describe, expect, it } from "vitest";
import { normalizeKiwiPayload } from "@/lib/flights/normalization/kiwi";

const fixture = {
  currency: "BRL",
  itineraries: [
    {
      id: "kiwi-1",
      price: 450,
      totalDurationSeconds: 7200,
      bookingUrl: "https://kiwi.com/u/abc",
      baggage: { cabinBag: 1, checkedBag: 0 },
      outbound: {
        from: "GRU",
        to: "GIG",
        departureTime: "2026-10-20T08:00:00",
        arrivalTime: "2026-10-20T10:00:00",
        durationSeconds: 7200,
        stops: 0,
        route: ["GRU", "GIG"],
        cabinClass: "Economy",
        segments: [
          {
            from: "GRU",
            to: "GIG",
            departureTime: "2026-10-20T08:00:00",
            arrivalTime: "2026-10-20T10:00:00",
            durationSeconds: 7200,
            carrier: "G3",
            carrierName: "GOL",
            flightNumber: "G31234",
            cabinClass: "Economy",
          },
        ],
      },
      inbound: null,
    },
  ],
};

describe("normalizeKiwiPayload", () => {
  it("maps kiwi MCP itineraries", () => {
    const offers = normalizeKiwiPayload(fixture);
    expect(offers).toHaveLength(1);
    expect(offers[0]?.provider).toBe("kiwi");
    expect(offers[0]?.totalAmount).toBe(450);
    expect(offers[0]?.currency).toBe("BRL");
    expect(offers[0]?.bookingUrl).toContain("kiwi.com");
    expect(offers[0]?.slices[0]?.segments[0]?.flightNumber).toBe("G31234");
  });
});
