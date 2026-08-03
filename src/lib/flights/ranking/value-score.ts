import type { NormalizedFlightOffer, SortMode } from "@/lib/flights/types";

/**
 * Value score (lower is better).
 *
 * Formula documented for transparency:
 *   score = priceWeight * normalizedPrice
 *         + durationWeight * normalizedDuration
 *         + stopsWeight * stops
 *         + layoverPenalty
 *         + selfTransferPenalty
 *         - baggageBonus
 *         - flexibilityBonus
 *
 * Where:
 * - normalizedPrice = totalAmount / medianPrice (cash) or points proxy
 * - layoverPenalty = max(0, (connectionMinutes - 180) / 60) * 0.15  (per long connection)
 * - selfTransferPenalty = 0.25 when separateTickets / self-transfer
 * - baggageBonus = 0.2 if checked bag included, +0.1 if carry-on mentioned
 * - flexibilityBonus = 0.15 if refundable, +0.1 if changeable
 *
 * Offers without a cash price are ranked after cash offers for "price"/"value".
 */
export type ValueScoreBreakdown = {
  score: number;
  normPrice: number;
  normDuration: number;
  stopsComponent: number;
  layoverPenalty: number;
  selfTransferPenalty: number;
  baggageBonus: number;
};

export function computeValueScoreBreakdown(
  offer: NormalizedFlightOffer,
  medianPrice: number,
  medianDuration: number,
): ValueScoreBreakdown {
  const price =
    offer.priceType === "cash" && offer.totalAmount != null
      ? offer.totalAmount
      : offer.pointsAmount != null
        ? offer.pointsAmount * 0.015 + (offer.taxesAmount ?? 0)
        : medianPrice * 2;

  const normPrice = medianPrice > 0 ? price / medianPrice : 1;
  const normDuration =
    medianDuration > 0 ? offer.totalDurationMinutes / medianDuration : 1;

  let layoverPenalty = 0;
  for (const slice of offer.slices) {
    for (let i = 0; i < slice.segments.length - 1; i++) {
      const arrive = Date.parse(slice.segments[i]!.arrivalAt);
      const depart = Date.parse(slice.segments[i + 1]!.departureAt);
      if (!Number.isFinite(arrive) || !Number.isFinite(depart)) continue;
      const connectionMin = (depart - arrive) / 60000;
      if (connectionMin > 180) {
        layoverPenalty += ((connectionMin - 180) / 60) * 0.15;
      }
    }
  }

  let baggageBonus = 0;
  if (offer.baggage?.checked && !/0|none|não|nao/i.test(offer.baggage.checked)) {
    baggageBonus += 0.2;
  }
  if (offer.baggage?.carryOn) baggageBonus += 0.1;
  if (offer.refundable) baggageBonus += 0.15;
  if (offer.changeable) baggageBonus += 0.1;

  const selfTransferPenalty = offer.separateTickets ? 0.25 : 0;
  const stopsComponent = 0.15 * offer.totalStops;

  const score =
    0.45 * normPrice +
    0.3 * normDuration +
    stopsComponent +
    layoverPenalty +
    selfTransferPenalty -
    baggageBonus;

  return {
    score,
    normPrice,
    normDuration,
    stopsComponent,
    layoverPenalty,
    selfTransferPenalty,
    baggageBonus,
  };
}

export function computeValueScore(
  offer: NormalizedFlightOffer,
  medianPrice: number,
  medianDuration: number,
): number {
  return computeValueScoreBreakdown(offer, medianPrice, medianDuration).score;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

export function getRankingMedians(offers: NormalizedFlightOffer[]): {
  medianPrice: number;
  medianDuration: number;
} {
  const cashPrices = offers
    .filter((o) => o.priceType === "cash" && o.totalAmount != null)
    .map((o) => o.totalAmount!);
  const durations = offers.map((o) => o.totalDurationMinutes);
  return {
    medianPrice: median(cashPrices) || 1,
    medianDuration: median(durations) || 1,
  };
}

export function rankOffers(
  offers: NormalizedFlightOffer[],
  mode: SortMode,
): NormalizedFlightOffer[] {
  const { medianPrice: medPrice, medianDuration: medDuration } =
    getRankingMedians(offers);

  const scored = offers.map((offer) => ({
    offer,
    value: computeValueScore(offer, medPrice, medDuration),
  }));

  scored.sort((a, b) => {
    switch (mode) {
      case "price": {
        const ap = a.offer.totalAmount ?? Number.POSITIVE_INFINITY;
        const bp = b.offer.totalAmount ?? Number.POSITIVE_INFINITY;
        if (a.offer.priceType !== b.offer.priceType) {
          return a.offer.priceType === "cash" ? -1 : 1;
        }
        if (a.offer.priceType === "points") {
          return (a.offer.pointsAmount ?? Infinity) - (b.offer.pointsAmount ?? Infinity);
        }
        return ap - bp;
      }
      case "duration":
        return a.offer.totalDurationMinutes - b.offer.totalDurationMinutes;
      case "stops":
        return a.offer.totalStops - b.offer.totalStops ||
          a.offer.totalDurationMinutes - b.offer.totalDurationMinutes;
      case "departure": {
        const ad = a.offer.slices[0]?.departureAt ?? "";
        const bd = b.offer.slices[0]?.departureAt ?? "";
        return ad.localeCompare(bd);
      }
      case "value":
      default:
        return a.value - b.value;
    }
  });

  return scored.map((s) => s.offer);
}

/**
 * Human-readable reasons why an offer ranks as best value vs the result set.
 */
export function explainBestValue(
  offer: NormalizedFlightOffer,
  pool: NormalizedFlightOffer[],
): string[] {
  if (pool.length === 0) return [];
  const { medianPrice, medianDuration } = getRankingMedians(pool);
  const breakdown = computeValueScoreBreakdown(offer, medianPrice, medianDuration);
  const reasons: string[] = [];

  const byPrice = rankOffers(pool, "price");
  const cheapest = byPrice[0];
  if (
    offer.priceType === "cash" &&
    offer.totalAmount != null &&
    cheapest?.totalAmount != null
  ) {
    if (offer.id === cheapest.id) {
      reasons.push("Menor preço entre as ofertas comparadas");
    } else {
      const delta = offer.totalAmount - cheapest.totalAmount;
      if (delta <= cheapest.totalAmount * 0.12) {
        reasons.push("Preço próximo do mais barato");
      } else {
        reasons.push("Preço competitivo em relação à mediana");
      }
    }
  }

  if (breakdown.normDuration <= 1.05) {
    reasons.push("Duração alinhada ou melhor que a mediana");
  } else if (breakdown.normDuration <= 1.25) {
    reasons.push("Duração razoável para o preço");
  }

  if (offer.totalStops === 0) {
    reasons.push("Voo direto (sem escalas)");
  } else if (offer.totalStops === 1) {
    reasons.push("Poucas escalas");
  }

  if (breakdown.baggageBonus >= 0.2) {
    reasons.push("Bagagem considerada na pontuação");
  }
  if (offer.refundable || offer.changeable) {
    reasons.push("Flexibilidade (reembolso/alteração) valorizada");
  }
  if (offer.separateTickets) {
    reasons.push("Penalizado por self-transfer / bilhetes separados");
  } else {
    reasons.push("Sem self-transfer");
  }

  if (reasons.length === 0) {
    reasons.push("Melhor equilíbrio entre preço, duração, escalas e bagagem");
  }

  return reasons.slice(0, 5);
}

export function pickHighlights(offers: NormalizedFlightOffer[]): {
  cheapestId?: string;
  fastestId?: string;
  bestValueId?: string;
  bestValueReasons?: string[];
} {
  if (offers.length === 0) return {};
  const byPrice = rankOffers(offers, "price");
  const byDuration = rankOffers(offers, "duration");
  const byValue = rankOffers(offers, "value");
  const best = byValue[0];
  return {
    cheapestId: byPrice[0]?.id,
    fastestId: byDuration[0]?.id,
    bestValueId: best?.id,
    bestValueReasons: best ? explainBestValue(best, offers) : undefined,
  };
}
