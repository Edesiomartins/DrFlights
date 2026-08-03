import { describe, expect, it } from "vitest";
import { searchAirports } from "@/lib/airports";
import { normalizeText, levenshteinBounded } from "@/lib/utils/text";

describe("text normalization + fuzzy", () => {
  it("strips accents", () => {
    expect(normalizeText("Goiânia")).toBe("goiania");
    expect(normalizeText("São Paulo")).toBe("sao paulo");
  });

  it("bounds levenshtein", () => {
    expect(levenshteinBounded("guarulhos", "guarulhus", 2)).toBe(1);
    expect(levenshteinBounded("abc", "xyz", 1)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("searchAirports", () => {
  it("finds by IATA", () => {
    const hits = searchAirports("GRU");
    expect(hits[0]?.iata).toBe("GRU");
  });

  it("finds Sao Paulo without accents", () => {
    const hits = searchAirports("sao paulo");
    expect(hits.some((a) => a.city.toLowerCase().includes("sao paulo") || a.iata === "GRU")).toBe(
      true,
    );
  });

  it("tolerates Guarulhos typo", () => {
    const hits = searchAirports("guarulhus");
    expect(hits.some((a) => a.iata === "GRU" || /guarulhos/i.test(a.name))).toBe(true);
  });

  it("finds Goiania with accent", () => {
    const hits = searchAirports("goiânia");
    expect(hits.some((a) => a.iata === "GYN" || /goiania/i.test(a.city))).toBe(true);
  });
});
