import { describe, expect, it } from "vitest";
import { extractDeal } from "@/lib/deals/ingest";

describe("extractDeal", () => {
  it("parses IATA routes", () => {
    const deal = extractDeal("Promo GRU → LIS por R$ 1.299,90");
    expect(deal).toMatchObject({
      origin: "GRU",
      destination: "LIS",
      price: 1299.9,
      currency: "BRL",
    });
  });

  it("resolves Portuguese city names", () => {
    const deal = extractDeal(
      "Passagem São Paulo para Lisboa a partir de R$ 2.150",
    );
    expect(deal.origin).toBe("GRU");
    expect(deal.destination).toBe("LIS");
    expect(deal.price).toBe(2150);
  });

  it("keeps price without inventing route", () => {
    const deal = extractDeal("Oferta surpresa por R$ 899,00 sem rota clara");
    expect(deal.price).toBe(899);
    expect(deal.origin).toBeUndefined();
    expect(deal.destination).toBeUndefined();
  });
});
