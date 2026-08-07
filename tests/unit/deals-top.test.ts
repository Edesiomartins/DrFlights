import { describe, expect, it } from "vitest";
import {
  clampTopDealsLimit,
  mapDealRow,
  mapSnapshotFallback,
  TOP_DEALS_DEFAULT_LIMIT,
  TOP_DEALS_MAX_LIMIT,
} from "@/lib/deals/top";

describe("clampTopDealsLimit", () => {
  it("defaults and caps", () => {
    expect(clampTopDealsLimit(undefined)).toBe(TOP_DEALS_DEFAULT_LIMIT);
    expect(clampTopDealsLimit("abc")).toBe(TOP_DEALS_DEFAULT_LIMIT);
    expect(clampTopDealsLimit(4)).toBe(4);
    expect(clampTopDealsLimit(99)).toBe(TOP_DEALS_MAX_LIMIT);
  });
});

describe("mapDealRow", () => {
  it("maps a real deal with affiliate href", () => {
    const item = mapDealRow({
      id: "deal-1",
      origin: "gru",
      destination: "lis",
      price: 1899.5,
      currency: "BRL",
      discountScore: 42.3,
      publishedAt: new Date("2026-08-05T12:00:00.000Z"),
      originalUrl: "https://parceiro.exemplo/oferta",
      title: "São Paulo → Lisboa",
      source: { name: "Melhores Destinos" },
    });

    expect(item).toMatchObject({
      id: "deal-1",
      origin: "GRU",
      destination: "LIS",
      price: 1899.5,
      currency: "BRL",
      discountScore: 42.3,
      isFallback: false,
      title: "São Paulo → Lisboa",
    });
    expect(item?.originCity).toBeTruthy();
    expect(item?.destinationCity).toBeTruthy();
    expect(item?.href).toMatch(/^\/api\/go\?/);
    expect(item?.href).toContain("placement=deals_top");
    expect(item?.href).toContain(
      encodeURIComponent("https://parceiro.exemplo/oferta"),
    );
  });

  it("rejects incomplete deals (no invented route/price)", () => {
    expect(
      mapDealRow({
        id: "x",
        origin: null,
        destination: "LIS",
        price: 100,
        currency: "BRL",
        discountScore: null,
        publishedAt: new Date(),
        originalUrl: "https://x.example",
        title: "sem origem",
      }),
    ).toBeNull();

    expect(
      mapDealRow({
        id: "y",
        origin: "GRU",
        destination: "LIS",
        price: null,
        currency: "BRL",
        discountScore: 10,
        publishedAt: new Date(),
        originalUrl: "https://x.example",
        title: "sem preço",
      }),
    ).toBeNull();
  });
});

describe("mapSnapshotFallback", () => {
  it("marks factual histórico rows as fallback with internal href", () => {
    const item = mapSnapshotFallback({
      origin: "gru",
      destination: "gig",
      price: 320,
      currency: "brl",
    });
    expect(item.origin).toBe("GRU");
    expect(item.destination).toBe("GIG");
    expect(item.price).toBe(320);
    expect(item.currency).toBe("BRL");
    expect(item.discountScore).toBeNull();
    expect(item.publishedAt).toBeNull();
    expect(item.href).toBe("/voos/gru-gig");
    expect(item.isFallback).toBe(true);
    expect(item.title).toBeNull();
    expect(item.id).toBe("snapshot:GRU-GIG");
    expect(item.originCity).toBeTruthy();
    expect(item.destinationCity).toBeTruthy();
  });
});
