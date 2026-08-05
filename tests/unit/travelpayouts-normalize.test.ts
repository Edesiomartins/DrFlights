import { describe, expect, it } from "vitest";
import { normalizeTravelpayoutsPayload } from "@/lib/flights/normalization/travelpayouts";
import type { FlightSearchInput } from "@/lib/flights/types";

const input: FlightSearchInput = { tripType: "one_way", slices: [{ origin: "GRU", destination: "GIG", departureDate: "2026-09-10" }], adults: 1, children: 0, infants: 0, cabin: "economy", currency: "BRL" };

describe("Travelpayouts normalization", () => {
  it("normalizes price, route and affiliate marker", () => {
    const [offer] = normalizeTravelpayoutsPayload({ data: [{ origin: "GRU", destination: "GIG", depart_date: "2026-09-10", value: 499.9, airline: "G3", duration: 65, transfers: 0 }] }, input, "drflights");
    expect(offer?.provider).toBe("travelpayouts");
    expect(offer?.totalAmount).toBe(499.9);
    expect(offer?.bookingUrl).toContain("marker=drflights");
  });

  it("ignores invalid prices", () => expect(normalizeTravelpayoutsPayload({ data: [{ value: 0 }] }, input)).toEqual([]));
});
