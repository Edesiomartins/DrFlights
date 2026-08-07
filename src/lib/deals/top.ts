import { buildGoUrl } from "@/lib/ads/config";
import { getAirportByIata } from "@/lib/airports";
import { prisma } from "@/lib/db/prisma";

export const TOP_DEALS_DEFAULT_LIMIT = 8;
export const TOP_DEALS_MAX_LIMIT = 20;

export type TopDealItem = {
  id: string;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  price: number;
  currency: string;
  discountScore: number | null;
  publishedAt: string | null;
  /** Affiliate exit URL via /api/go — null for histórico fallback (sem oferta externa). */
  href: string | null;
  isFallback: boolean;
  title: string | null;
};

export type TopDealsResult = {
  items: TopDealItem[];
};

function cityForIata(code: string): string {
  return getAirportByIata(code)?.city ?? code;
}

export function clampTopDealsLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return TOP_DEALS_DEFAULT_LIMIT;
  return Math.min(TOP_DEALS_MAX_LIMIT, Math.floor(n));
}

export function mapDealRow(deal: {
  id: string;
  origin: string | null;
  destination: string | null;
  price: number | null;
  currency: string | null;
  discountScore: number | null;
  publishedAt: Date;
  originalUrl: string;
  title: string;
  source?: { name: string } | null;
}): TopDealItem | null {
  if (
    !deal.origin ||
    !deal.destination ||
    deal.price == null ||
    !Number.isFinite(deal.price) ||
    deal.price <= 0
  ) {
    return null;
  }

  const origin = deal.origin.toUpperCase();
  const destination = deal.destination.toUpperCase();

  return {
    id: deal.id,
    origin,
    destination,
    originCity: cityForIata(origin),
    destinationCity: cityForIata(destination),
    price: deal.price,
    currency: (deal.currency ?? "BRL").toUpperCase(),
    discountScore: deal.discountScore,
    publishedAt: deal.publishedAt.toISOString(),
    href: buildGoUrl({
      to: deal.originalUrl,
      placement: "deals_top",
      partner: deal.source?.name,
    }),
    isFallback: false,
    title: deal.title || null,
  };
}

export function mapSnapshotFallback(row: {
  origin: string;
  destination: string;
  price: number;
  currency: string;
}): TopDealItem {
  const origin = row.origin.toUpperCase();
  const destination = row.destination.toUpperCase();
  return {
    id: `snapshot:${origin}-${destination}`,
    origin,
    destination,
    originCity: cityForIata(origin),
    destinationCity: cityForIata(destination),
    price: row.price,
    currency: row.currency.toUpperCase(),
    discountScore: null,
    publishedAt: null,
    href: `/voos/${origin.toLowerCase()}-${destination.toLowerCase()}`,
    isFallback: true,
    title: null,
  };
}

export async function getTopDeals(input?: {
  limit?: number;
}): Promise<TopDealsResult> {
  const limit = clampTopDealsLimit(input?.limit ?? TOP_DEALS_DEFAULT_LIMIT);

  const deals = await prisma.deal.findMany({
    where: {
      status: { in: ["NEW", "VERIFIED"] },
      price: { not: null },
      origin: { not: null },
      destination: { not: null },
    },
    include: { source: { select: { name: true } } },
    orderBy: [{ discountScore: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });

  const items = deals
    .map(mapDealRow)
    .filter((item): item is TopDealItem => item != null);

  if (items.length > 0) {
    return { items };
  }

  return { items: await loadSnapshotFallback(limit) };
}

async function loadSnapshotFallback(limit: number): Promise<TopDealItem[]> {
  const rows = await prisma.priceSnapshot.findMany({
    where: { amount: { not: null }, currency: "BRL" },
    select: {
      origin: true,
      destination: true,
      amount: true,
      currency: true,
      observedAt: true,
    },
    orderBy: { observedAt: "desc" },
    take: 2000,
  });

  const bestByRoute = new Map<
    string,
    { origin: string; destination: string; price: number; currency: string }
  >();

  for (const row of rows) {
    if (row.amount == null || !Number.isFinite(row.amount) || row.amount <= 0) {
      continue;
    }
    const origin = row.origin.toUpperCase();
    const destination = row.destination.toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) continue;
    if (origin === destination) continue;

    const key = `${origin}-${destination}`;
    const current = bestByRoute.get(key);
    if (!current || row.amount < current.price) {
      bestByRoute.set(key, {
        origin,
        destination,
        price: row.amount,
        currency: (row.currency ?? "BRL").toUpperCase(),
      });
    }
  }

  return [...bestByRoute.values()]
    .sort((a, b) => a.price - b.price)
    .slice(0, limit)
    .map(mapSnapshotFallback);
}
