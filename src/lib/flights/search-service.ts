import { TripType as PrismaTripType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dedupeOffers, flattenGroups } from "@/lib/flights/deduplication/dedupe";
import { buildSearchRequestHash } from "@/lib/flights/normalization/helpers";
import { classifyPromotion } from "@/lib/flights/promotions/classify";
import {
  canCallProvider,
  circuitFieldsForPersist,
  hydrateCircuitBreakers,
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/flights/providers/circuit-breaker";
import { getFlightProviders } from "@/lib/flights/providers/registry";
import { pickHighlights, rankOffers } from "@/lib/flights/ranking/value-score";
import type {
  AggregatedSearchResult,
  FlightSearchInput,
  NormalizedFlightOffer,
  ProviderSearchResult,
} from "@/lib/flights/types";
import { reportMonitoringEvent } from "@/lib/monitoring";
import {
  getDefaultCurrency,
  getSearchCacheTtlSeconds,
} from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { getRoutePriceStats } from "@/lib/price-intel/stats";

async function buildPriceIntel(offers: NormalizedFlightOffer[], input: FlightSearchInput): Promise<AggregatedSearchResult["priceIntel"]> {
  const origin=input.slices[0]?.origin; const destination=input.slices[input.slices.length-1]?.destination;
  if(!origin||!destination)return undefined;
  const stats=await getRoutePriceStats(origin,destination);
  if(!stats.enough||stats.p25==null||stats.p75==null)return undefined;
  const classifications:Record<string,"BAIXO"|"TIPICO"|"ALTO">={};
  for(const offer of offers){if(offer.totalAmount==null)continue;classifications[offer.id]=offer.totalAmount<=stats.p25?"BAIXO":offer.totalAmount>=stats.p75?"ALTO":"TIPICO";}
  return {sampleCount:stats.sampleCount,median:stats.median,p25:stats.p25,p75:stats.p75,weekly:stats.weekly,classifications};
}
async function buildMileageBonuses(offers:NormalizedFlightOffer[]){const programs=[...new Set(offers.flatMap((o)=>o.pointsProgram?[o.pointsProgram]:[]))];if(!programs.length)return{};const promos=await prisma.mileageTransferPromo.findMany({where:{status:"ACTIVE",validUntil:{gt:new Date()},destinationProgram:{in:programs}}});return Object.fromEntries(programs.map((program)=>[program,Math.max(0,...promos.filter((p)=>p.destinationProgram.toLowerCase()===program.toLowerCase()).map((p)=>p.bonusPercent))]).filter(([,bonus])=>Number(bonus)>0));}

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
    const circuit = circuitFieldsForPersist(result.provider);
    await prisma.providerStatus.upsert({
      where: { provider: result.provider },
      create: {
        provider: result.provider,
        enabled: result.status !== "disabled" && result.status !== "circuit_open",
        lastStatus: result.status,
        lastLatencyMs: result.durationMs,
        lastSuccessAt: ok ? new Date() : undefined,
        lastFailureAt:
          ok || result.status === "circuit_open" ? undefined : new Date(),
        lastError: result.error?.message,
        consecutiveFailures: circuit.consecutiveFailures,
        circuitState: circuit.circuitState,
        circuitOpenedAt: circuit.circuitOpenedAt,
      },
      update: {
        enabled: result.status !== "disabled",
        lastStatus: result.status,
        lastLatencyMs: result.durationMs,
        lastSuccessAt: ok ? new Date() : undefined,
        lastFailureAt:
          ok || result.status === "circuit_open" ? undefined : new Date(),
        lastError: result.error?.message ?? null,
        consecutiveFailures: circuit.consecutiveFailures,
        circuitState: circuit.circuitState,
        circuitOpenedAt: circuit.circuitOpenedAt,
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
              86400000,
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

function trackCircuitOutcome(result: ProviderSearchResult): void {
  if (result.status === "circuit_open" || result.status === "disabled") return;
  const hardFailure =
    result.status === "error" &&
    result.error?.code !== "NO_RESULTS" &&
    (result.error?.retryable !== false || result.error?.code === "TIMEOUT");

  if (result.status === "success" || result.status === "partial") {
    recordProviderSuccess(result.provider);
    return;
  }

  if (hardFailure || result.status === "error") {
    // Auth errors shouldn't trip the breaker forever in open loop —
    // still count as failure so we briefly back off.
    recordProviderFailure(result.provider);
  }
}

async function searchProviders(
  input: FlightSearchInput,
): Promise<ProviderSearchResult[]> {
  const providers = getFlightProviders();
  await hydrateCircuitBreakers(providers.map((p) => p.id));

  const primaryProviders = providers.filter((provider) => provider.id !== "amadeus");

  const settled = await Promise.allSettled(
    primaryProviders.map(async (provider) => {
      if (!canCallProvider(provider.id)) {
        return {
          provider: provider.id,
          status: "circuit_open" as const,
          offers: [],
          durationMs: 0,
          error: {
            code: "CIRCUIT_OPEN",
            message:
              "Fonte temporariamente pausada após falhas consecutivas. Tentaremos de novo em breve.",
            retryable: true,
          },
        } satisfies ProviderSearchResult;
      }
      return provider.search(input);
    }),
  );

  const primaryResults = settled.map((result, idx) => {
    const provider = primaryProviders[idx]!;
    if (result.status === "fulfilled") {
      trackCircuitOutcome(result.value);
      reportMonitoringEvent({
        type: "provider_latency",
        provider: provider.id,
        durationMs: result.value.durationMs,
        status: result.value.status,
        tags: { code: result.value.error?.code },
      });
      return result.value;
    }
    recordProviderFailure(provider.id);
    const unexpected: ProviderSearchResult = {
      provider: provider.id,
      status: "error",
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
    reportMonitoringEvent({
      type: "provider_latency",
      provider: provider.id,
      durationMs: 0,
      status: "error",
      tags: { code: "UNEXPECTED" },
    });
    return unexpected;
  });

  const travelpayoutsHasOffers = primaryResults.some(
    (result) => result.provider === "travelpayouts" && result.offers.length > 0,
  );
  const amadeus = providers.find((provider) => provider.id === "amadeus");
  if (!amadeus || travelpayoutsHasOffers) return primaryResults;
  if (!canCallProvider(amadeus.id)) {
    return [...primaryResults, { provider: amadeus.id, status: "circuit_open", offers: [], durationMs: 0, error: { code: "CIRCUIT_OPEN", message: "Fonte temporariamente pausada.", retryable: true } }];
  }
  const fallback = await amadeus.search(input);
  trackCircuitOutcome(fallback);
  return [...primaryResults, fallback];
}

export async function searchFlights(
  input: FlightSearchInput,
  options?: { userId?: string | null; bypassCache?: boolean },
): Promise<AggregatedSearchResult> {
  const started = Date.now();
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
      const flat = flattenGroups(groups);
      reportMonitoringEvent({
        type: "search_latency",
        durationMs: Date.now() - started,
        status: "cached",
        tags: { offerCount: flat.length },
      });
      return {
        searchId: cached.id,
        cached: true,
        requestHash,
        offers: flat,
        groups,
        providerStatuses:
          cached.providerStatuses as unknown as ProviderSearchResult[],
        highlights: pickHighlights(flat),
        priceIntel: await buildPriceIntel(flat, input),
        mileageBonuses: await buildMileageBonuses(flat),
      };
    }
  }

  const providerStatuses = await searchProviders(input);
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

    const [outboundStatuses, inboundStatuses] = await Promise.all([
      searchProviders(outInput),
      searchProviders(inInput),
    ]);

    const outbound = outboundStatuses.flatMap((r) => r.offers);
    const inbound = inboundStatuses.flatMap((r) => r.offers);

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
  const priceIntel = await buildPriceIntel(flat, input);
  const mileageBonuses = await buildMileageBonuses(flat);

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

  const durationMs = Date.now() - started;
  logger.info("flights.search.completed", {
    searchId: saved.id,
    offerCount: flat.length,
    durationMs,
    providers: providerStatuses.map((p) => ({
      id: p.provider,
      status: p.status,
      durationMs: p.durationMs,
    })),
  });

  reportMonitoringEvent({
    type: "search_latency",
    durationMs,
    status: "live",
    tags: {
      offerCount: flat.length,
      providerErrors: providerStatuses.filter((p) => p.status === "error").length,
      circuitOpen: providerStatuses.filter((p) => p.status === "circuit_open").length,
    },
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
    priceIntel,
    mileageBonuses,
  };
}
