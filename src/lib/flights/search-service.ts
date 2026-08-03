import { TripType as PrismaTripType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dedupeOffers, flattenGroups } from "@/lib/flights/deduplication/dedupe";
import { buildSearchRequestHash } from "@/lib/flights/normalization/helpers";
import { classifyPromotion } from "@/lib/flights/promotions/classify";
import { getFlightProviders } from "@/lib/flights/providers/registry";
import { pickHighlights, rankOffers } from "@/lib/flights/ranking/value-score";
import type {
  AggregatedSearchResult,
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderSearchResult,
} from "@/lib/flights/types";
import {
  getDefaultCurrency,
  getSearchCacheTtlSeconds,
} from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

function toPrismaTripType(tripType: FlightSearchInput["tripType"]): PrismaTripType {
  switch (tripType) {
    case "round_trip":
      return PrismaTripType.ROUND_TRIP;
    case "multi_city":
      return PrismaTripType.MULTI_CITY;
    default:
      return PrismaTripType.ONE_WAY;
  }
}

async function persistProviderStatuses(results: ProviderSearchResult[]) {
  for (const result of results) {
    const ok = result.status === "success" || result.status === "partial";
    await prisma.providerStatus.upsert({
      where: { provider: result.provider },
      create: {
        provider: result.provider,
        enabled: result.status !== "disabled",
        lastStatus: result.status,
        lastLatencyMs: result.durationMs,
        lastSuccessAt: ok ? new Date() : undefined,
        lastFailureAt: ok ? undefined : new Date(),
        lastError: result.error?.message,
      },
      update: {
        enabled: result.status !== "disabled",
        lastStatus: result.status,
        lastLatencyMs: result.durationMs,
        lastSuccessAt: ok ? new Date() : undefined,
        lastFailureAt: ok ? undefined : new Date(),
        lastError: result.error?.message ?? null,
      },
    });
  }
}

async function applyPromotions(
  offers: NormalizedFlightOffer[],
  input: FlightSearchInput,
): Promise<NormalizedFlightOffer[]> {
  const origin = input.slices[0]?.origin;
  const destination = input.slices[input.slices.length - 1]?.destination;
  if (!origin || !destination) return offers;

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      origin,
      destination,
      cabin: input.cabin,
      tripType: toPrismaTripType(input.tripType),
      amount: { not: null },
      observedAt: { gte: since },
    },
    select: { amount: true, departureDate: true },
    take: 500,
  });

  const targetDate = input.slices[0]?.departureDate;
  const weighted = snapshots
    .filter((s) => s.amount != null)
    .map((s) => {
      const dayDiff = targetDate
        ? Math.abs(
            (Date.parse(s.departureDate) - Date.parse(targetDate)) /
              (86400000),
          )
        : 0;
      return { amount: s.amount!, dayDiff };
    })
    .sort((a, b) => a.dayDiff - b.dayDiff);

  const historical = weighted.slice(0, 100).map((w) => w.amount);

  return offers.map((offer) => {
    if (offer.priceType !== "cash" || offer.totalAmount == null) return offer;
    const promo = classifyPromotion(offer.totalAmount, historical, 90);
    return {
      ...offer,
      promotionLabel: promo.label,
      promotionMeta:
        promo.medianPrice != null && promo.percentDiff != null
          ? {
              currentPrice: promo.currentPrice,
              medianPrice: promo.medianPrice,
              percentDiff: promo.percentDiff,
              sampleCount: promo.sampleCount,
              periodDays: promo.periodDays,
            }
          : {
              currentPrice: promo.currentPrice,
              medianPrice: 0,
              percentDiff: 0,
              sampleCount: promo.sampleCount,
              periodDays: promo.periodDays,
            },
    };
  });
}

async function saveSnapshots(
  offers: NormalizedFlightOffer[],
  input: FlightSearchInput,
) {
  const origin = input.slices[0]?.origin;
  const destination = input.slices[input.slices.length - 1]?.destination;
  const departureDate = input.slices[0]?.departureDate;
  if (!origin || !destination || !departureDate) return;

  const returnDate =
    input.tripType === "round_trip"
      ? input.slices[1]?.departureDate
      : undefined;

  const rows = offers.slice(0, 40).map((offer) => ({
    provider: offer.provider,
    itineraryHash: offer.itineraryHash,
    origin,
    destination,
    departureDate,
    returnDate,
    tripType: toPrismaTripType(input.tripType),
    cabin: offer.cabin,
    amount: offer.totalAmount,
    currency: offer.currency ?? getDefaultCurrency(),
    pointsAmount: offer.pointsAmount,
    pointsProgram: offer.pointsProgram,
    stops: offer.totalStops,
    durationMinutes: offer.totalDurationMinutes,
    observedAt: new Date(offer.observedAt),
  }));

  if (rows.length > 0) {
    await prisma.priceSnapshot.createMany({ data: rows });
  }
}

function combineSeparateLegs(
  outbound: NormalizedFlightOffer[],
  inbound: NormalizedFlightOffer[],
): NormalizedFlightOffer[] {
  const outTop = outbound
    .filter((o) => o.priceType === "cash" && o.totalAmount != null)
    .slice(0, 8);
  const inTop = inbound
    .filter((o) => o.priceType === "cash" && o.totalAmount != null)
    .slice(0, 8);

  const combined: NormalizedFlightOffer[] = [];
  for (const out of outTop) {
    for (const inn of inTop) {
      const totalAmount = (out.totalAmount ?? 0) + (inn.totalAmount ?? 0);
      const slices = [...out.slices, ...inn.slices];
      combined.push({
        ...out,
        id: `sep-${out.id}-${inn.id}`,
        provider: `${out.provider}+${inn.provider}`,
        providerOfferId: `${out.providerOfferId}|${inn.providerOfferId}`,
        totalAmount,
        currency: out.currency ?? inn.currency,
        airlineName:
          out.airlineCode === inn.airlineCode
            ? out.airlineName
            : `${out.airlineName} + ${inn.airlineName}`,
        operatingCarriers: [
          ...new Set([...out.operatingCarriers, ...inn.operatingCarriers]),
        ],
        slices,
        totalDurationMinutes: out.totalDurationMinutes + inn.totalDurationMinutes,
        totalStops: out.totalStops + inn.totalStops,
        separateTickets: true,
        bookingUrl: out.bookingUrl ?? inn.bookingUrl,
        itineraryHash: `${out.itineraryHash}:${inn.itineraryHash}`,
        observedAt: new Date().toISOString(),
      });
    }
  }
  return combined;
}

export async function searchFlights(
  input: FlightSearchInput,
  options?: { userId?: string | null; bypassCache?: boolean },
): Promise<AggregatedSearchResult> {
  const requestHash = buildSearchRequestHash(input);
  const ttl = getSearchCacheTtlSeconds();

  if (!options?.bypassCache) {
    const cached = await prisma.search.findFirst({
      where: {
        requestHash,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (cached) {
      const offers = cached.normalizedResults as unknown as NormalizedFlightOffer[];
      const groups = dedupeOffers(offers);
      return {
        searchId: cached.id,
        cached: true,
        requestHash,
        offers: flattenGroups(groups),
        groups,
        providerStatuses:
          cached.providerStatuses as unknown as ProviderSearchResult[],
        highlights: pickHighlights(flattenGroups(groups)),
      };
    }
  }

  const providers = getFlightProviders();
  const settled = await Promise.allSettled(
    providers.map((p) => p.search(input)),
  );

  const providerStatuses: ProviderSearchResult[] = settled.map((result, idx) => {
    const provider = providers[idx]!;
    if (result.status === "fulfilled") return result.value;
    return {
      provider: provider.id,
      status: "error" as const,
      offers: [],
      durationMs: 0,
      error: {
        code: "UNEXPECTED",
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Falha inesperada",
        retryable: true,
      },
    };
  });

  let offers = providerStatuses.flatMap((p) => p.offers);

  let separateLegsComparison: AggregatedSearchResult["separateLegsComparison"];

  if (
    input.compareSeparateLegs &&
    input.tripType === "round_trip" &&
    input.slices.length === 2
  ) {
    const outInput: FlightSearchInput = {
      ...input,
      tripType: "one_way",
      slices: [input.slices[0]!],
      compareSeparateLegs: false,
    };
    const inInput: FlightSearchInput = {
      ...input,
      tripType: "one_way",
      slices: [
        {
          origin: input.slices[1]!.origin,
          destination: input.slices[1]!.destination,
          departureDate: input.slices[1]!.departureDate,
        },
      ],
      compareSeparateLegs: false,
    };

    const [outSettled, inSettled] = await Promise.all([
      Promise.allSettled(providers.map((p) => p.search(outInput))),
      Promise.allSettled(providers.map((p) => p.search(inInput))),
    ]);

    const outbound = outSettled
      .filter((r): r is PromiseFulfilledResult<ProviderSearchResult> => r.status === "fulfilled")
      .flatMap((r) => r.value.offers);
    const inbound = inSettled
      .filter((r): r is PromiseFulfilledResult<ProviderSearchResult> => r.status === "fulfilled")
      .flatMap((r) => r.value.offers);

    const combined = combineSeparateLegs(outbound, inbound);
    offers = [...offers, ...combined];

    const rtLowest = offers
      .filter((o) => !o.separateTickets && o.totalAmount != null)
      .map((o) => o.totalAmount!)
      .sort((a, b) => a - b)[0];
    const sepLowest = combined
      .map((o) => o.totalAmount!)
      .sort((a, b) => a - b)[0];

    separateLegsComparison = {
      roundTripLowest: rtLowest,
      separateLowest: sepLowest,
      currency: getDefaultCurrency(),
      note:
        "Trechos separados são bilhetes independentes. Conexões autônomas (self-transfer) têm risco de extravio de bagagem e perda de proteção em atraso.",
    };
  }

  offers = await applyPromotions(offers, input);
  const ranked = rankOffers(offers, "value");
  const groups = dedupeOffers(ranked);
  const flat = flattenGroups(groups);
  const highlights = pickHighlights(flat);

  const expiresAt = new Date(Date.now() + ttl * 1000);
  const saved = await prisma.search.create({
    data: {
      userId: options?.userId ?? null,
      requestHash,
      requestData: input,
      normalizedResults: flat,
      providerStatuses,
      expiresAt,
    },
  });

  await Promise.all([
    persistProviderStatuses(providerStatuses),
    saveSnapshots(flat, input),
  ]);

  logger.info("flights.search.completed", {
    searchId: saved.id,
    offerCount: flat.length,
    providers: providerStatuses.map((p) => ({
      id: p.provider,
      status: p.status,
      durationMs: p.durationMs,
    })),
  });

  return {
    searchId: saved.id,
    cached: false,
    requestHash,
    offers: flat,
    groups,
    providerStatuses,
    highlights,
    separateLegsComparison,
  };
}
