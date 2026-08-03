import { describe, expect, it } from "vitest";
import { normalizeSkiplaggedPayload } from "@/lib/flights/normalization/skiplagged";

const fixture = {
  flights: [
    {
      id: "sk-1",
      price: { amount: 299.5, currency: "USD" },
      airline: "United",
      airlineCode: "UA",
      bookingUrl: "https://skiplagged.com/flights/...",
      hidden_city: true,
      outbound: {
        durationMinutes: 360,
        stops: 1,
        segments: [
          {
            from: "SFO",
            to: "ORD",
            departure_time: "2026-10-20T08:00:00",
            arrival_time: "2026-10-20T14:00:00",
            duration_minutes: 240,
            airline_code: "UA",
            flight_number: "100",
            airline: "United",
          },
          {
            from: "ORD",
            to: "JFK",
            departure_time: "2026-10-20T16:00:00",
            arrival_time: "2026-10-20T19:00:00",
            duration_minutes: 120,
            airline_code: "UA",
            flight_number: "200",
            airline: "United",
          },
        ],
      },
    },
  ],
};

describe("normalizeSkiplaggedPayload", () => {
  it("maps skiplagged flights and flags hidden-city", () => {
    const offers = normalizeSkiplaggedPayload(fixture);
    expect(offers).toHaveLength(1);
    expect(offers[0]?.provider).toBe("skiplagged");
    expect(offers[0]?.totalAmount).toBe(299.5);
    expect(offers[0]?.separateTickets).toBe(true);
    expect(offers[0]?.totalStops).toBe(1);
  });

  it("ignores entries without price", () => {
    expect(normalizeSkiplaggedPayload({ flights: [{ id: "x" }] })).toHaveLength(0);
  });
});
