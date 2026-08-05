import { describe, expect, it } from "vitest";
import {
  getCityIataDictionarySize,
  resolveCityToIata,
} from "@/lib/geo/city-iata";

describe("city → IATA", () => {
  it("covers a meaningful Brazilian + international dictionary", () => {
    expect(getCityIataDictionarySize()).toBeGreaterThan(40);
  });

  it("resolves São Paulo to GRU with alternates", () => {
    const resolved = resolveCityToIata("São Paulo");
    expect(resolved?.primary).toBe("GRU");
    expect(resolved?.candidates).toEqual(
      expect.arrayContaining(["GRU", "CGH", "VCP"]),
    );
  });

  it("resolves Lisboa and accepts raw IATA", () => {
    expect(resolveCityToIata("Lisboa")?.primary).toBe("LIS");
    expect(resolveCityToIata("gig")?.primary).toBe("GIG");
  });

  it("returns null for unknown cities (never invents)", () => {
    expect(resolveCityToIata("Atlantis Bay")).toBeNull();
  });
});
