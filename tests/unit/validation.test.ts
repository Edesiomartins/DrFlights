import { describe, expect, it } from "vitest";
import { alertPatchSchema, alertSchema, flightSearchSchema } from "@/lib/flights/validation";

describe("flightSearchSchema", () => {
  it("accepts valid round trip", () => {
    const parsed = flightSearchSchema.safeParse({
      tripType: "round_trip",
      slices: [
        { origin: "gru", destination: "gig", departureDate: "2026-09-01" },
        { origin: "gig", destination: "gru", departureDate: "2026-09-10" },
      ],
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "economy",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slices[0]?.origin).toBe("GRU");
    }
  });

  it("rejects infants > adults", () => {
    const parsed = flightSearchSchema.safeParse({
      tripType: "one_way",
      slices: [{ origin: "GRU", destination: "GIG", departureDate: "2026-09-01" }],
      adults: 1,
      children: 0,
      infants: 2,
      cabin: "economy",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("alertSchema", () => {
  it("accepts open destination with max price", () => {
    const parsed = alertSchema.safeParse({
      origin: "GRU",
      destination: "ANY",
      anyDestination: true,
      departureDateFrom: "2026-09-01",
      departureDateTo: "2026-09-30",
      maxPrice: 1200,
      cabin: "economy",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects open destination without maxPrice or promoOnly", () => {
    const parsed = alertSchema.safeParse({
      origin: "GRU",
      destination: "ANY",
      anyDestination: true,
      departureDateFrom: "2026-09-01",
      departureDateTo: "2026-09-30",
      cabin: "economy",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows partial toggle without destination checks", () => {
    const parsed = alertPatchSchema.safeParse({ active: false });
    expect(parsed.success).toBe(true);
  });
});
