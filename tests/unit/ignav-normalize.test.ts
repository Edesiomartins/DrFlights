import { describe, expect, it } from "vitest";
import { normalizeIgnavItinerary } from "@/lib/flights/normalization/ignav";

const fixture = {
  ignav_id: "ign_abc",
  price: { amount: 499.9, currency: "BRL" },
  cabin_class: "economy",
  bags: { carry_on: 1, checked: 1 },
  booking_url: "https://example.com/book",
  outbound: {
    carrier: "G3",
    duration_minutes: 70,
    segments: [
      {
        marketing_carrier_code: "G3",
        flight_number: 1200,
        departure_airport: "GRU",
        departure_time_local: "2026-09-01T10:00:00",
        arrival_airport: "GIG",
        arrival_time_local: "2026-09-01T11:10:00",
        duration_minutes: 70,
      },
    ],
  },
  inbound: {
    carrier: "G3",
    duration_minutes: 75,
    segments: [
      {
        marketing_carrier_code: "G3",
        flight_number: 1201,
        departure_airport: "GIG",
        departure_time_local: "2026-09-10T18:00:00",
        arrival_airport: "GRU",
        arrival_time_local: "2026-09-10T19:15:00",
        duration_minutes: 75,
      },
    ],
  },
};

describe("normalizeIgnavItinerary", () => {
  it("maps round-trip itinerary", () => {
    const offer = normalizeIgnavItinerary(fixture);
    expect(offer).not.toBeNull();
    expect(offer!.provider).toBe("ignav");
    expect(offer!.slices).toHaveLength(2);
    expect(offer!.totalAmount).toBe(499.9);
    expect(offer!.bookingUrl).toContain("example.com");
    expect(offer!.totalDurationMinutes).toBe(145);
  });
});
