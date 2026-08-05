import { prisma } from "@/lib/db/prisma";
import { scoreDealAnomaly } from "@/lib/deals/anomaly";
import { resolveCityToIata } from "@/lib/geo/city-iata";
import { logger } from "@/lib/utils/logger";

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function tag(block: string, name: string) {
  return decode(
    block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ??
      "",
  );
}

export type ExtractedDeal = {
  origin?: string;
  destination?: string;
  originCandidates?: string[];
  destinationCandidates?: string[];
  price?: number;
  currency?: string;
};

/**
 * Extract price and route from PT-BR deal text.
 * Never invents IATA — unresolved cities simply omit origin/destination.
 */
export function extractDeal(text: string): ExtractedDeal {
  const priceMatch = text.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i);
  const price = priceMatch
    ? Number(priceMatch[1]!.replace(/\./g, "").replace(",", "."))
    : undefined;

  const iataRoute = text.match(
    /\b([A-Za-z]{3})\s*(?:→|->|–|—|-)\s*([A-Za-z]{3})\b/,
  );
  if (iataRoute?.[1] && iataRoute[2]) {
    const origin = iataRoute[1].toUpperCase();
    const destination = iataRoute[2].toUpperCase();
    if (/^[A-Z]{3}$/.test(origin) && /^[A-Z]{3}$/.test(destination)) {
      return {
        origin,
        destination,
        originCandidates: [origin],
        destinationCandidates: [destination],
        price,
        currency: price != null ? "BRL" : undefined,
      };
    }
  }

  // City names: "São Paulo → Lisboa", "de SP para Madrid", etc.
  const cityRoute =
    text.match(
      /(?:de\s+)?([A-Za-zÀ-ÿ\s.'-]{2,40}?)\s*(?:→|->|–|—|-|para|x)\s*([A-Za-zÀ-ÿ\s.'-]{2,40}?)(?:\s|$|,|\.|:|;|R\$)/i,
    ) ??
    text.match(
      /([A-Za-zÀ-ÿ\s.'-]{2,30})\s+(?:para|x)\s+([A-Za-zÀ-ÿ\s.'-]{2,30})/i,
    );

  if (cityRoute?.[1] && cityRoute[2]) {
    const originResolved = resolveCityToIata(cityRoute[1]);
    const destResolved = resolveCityToIata(cityRoute[2]);
    return {
      origin: originResolved?.primary,
      destination: destResolved?.primary,
      originCandidates: originResolved?.candidates,
      destinationCandidates: destResolved?.candidates,
      price,
      currency: price != null ? "BRL" : undefined,
    };
  }

  return {
    price,
    currency: price != null ? "BRL" : undefined,
  };
}

export async function ingestDeals() {
  const sources = await prisma.dealSource.findMany({
    where: { enabled: true, type: "RSS", url: { not: null } },
  });
  let created = 0;
  let errors = 0;

  for (const source of sources) {
    const started = Date.now();
    let itemsOk = 0;
    let lastError: string | null = null;
    try {
      const res = await fetch(source.url!, {
        headers: { "User-Agent": "DrFlights/1.0 deal-feed-reader" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const entries = [
        ...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi),
      ].slice(0, 30);

      for (const match of entries) {
        const block = match[1] ?? "";
        const title = tag(block, "title");
        const description =
          tag(block, "description") ||
          tag(block, "summary") ||
          tag(block, "content");
        const link =
          tag(block, "link") ||
          block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ||
          "";
        if (!title || !link) continue;

        const parsed = extractDeal(`${title} ${description}`);
        const anomaly =
          parsed.origin && parsed.destination && parsed.price
            ? await scoreDealAnomaly(
                parsed.origin,
                parsed.destination,
                parsed.price,
              )
            : null;

        await prisma.deal.upsert({
          where: {
            sourceId_originalUrl: { sourceId: source.id, originalUrl: link },
          },
          update: {
            title,
            price: parsed.price,
            origin: parsed.origin,
            destination: parsed.destination,
            discountScore: anomaly?.discountScore,
          },
          create: {
            sourceId: source.id,
            title,
            originalUrl: link,
            publishedAt: new Date(
              tag(block, "pubDate") ||
                tag(block, "published") ||
                Date.now(),
            ),
            origin: parsed.origin,
            destination: parsed.destination,
            price: parsed.price,
            currency: parsed.currency,
            discountScore: anomaly?.discountScore,
            status: anomaly?.candidate ? "VERIFIED" : "NEW",
          },
        });
        created += 1;
        itemsOk += 1;
      }

      await prisma.dealSource.update({
        where: { id: source.id },
        data: {
          lastIngestAt: new Date(),
          lastIngestCount: itemsOk,
          lastIngestError: null,
          lastIngestDurationMs: Date.now() - started,
        },
      });
    } catch (error) {
      errors += 1;
      lastError = error instanceof Error ? error.message : "unknown";
      logger.warn("deals.ingest_failed", {
        source: source.name,
        error: lastError,
      });
      await prisma.dealSource.update({
        where: { id: source.id },
        data: {
          lastIngestAt: new Date(),
          lastIngestCount: 0,
          lastIngestError: lastError,
          lastIngestDurationMs: Date.now() - started,
        },
      });
    }
  }

  return { sources: sources.length, processed: created, errors };
}
