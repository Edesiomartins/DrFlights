import type {
  DedupedOfferGroup,
  NormalizedFlightOffer,
} from "@/lib/flights/types";
import { ensureItineraryHash } from "@/lib/flights/deduplication/itinerary-hash";

function offerSortKey(offer: NormalizedFlightOffer): number {
  if (offer.priceType === "cash" && offer.totalAmount != null) {
    return offer.totalAmount;
  }
  if (offer.priceType === "points" && offer.pointsAmount != null) {
    // Rough ordering: treat points as secondary (higher = worse for grouping)
    return offer.pointsAmount * 0.01 + (offer.taxesAmount ?? 0);
  }
  return Number.POSITIVE_INFINITY;
}

function isPreferable(
  candidate: NormalizedFlightOffer,
  current: NormalizedFlightOffer,
): boolean {
  const c = offerSortKey(candidate);
  const cur = offerSortKey(current);
  if (c !== cur) return c < cur;
  // Prefer cash when equal-ish; then prefer known booking URL
  if (candidate.priceType !== current.priceType) {
    return candidate.priceType === "cash";
  }
  if (Boolean(candidate.bookingUrl) !== Boolean(current.bookingUrl)) {
    return Boolean(candidate.bookingUrl);
  }
  return false;
}

/**
 * Groups identical itineraries across providers.
 * Keeps alternatives when baggage/refund rules differ — we never drop them.
 */
export function dedupeOffers(
  offers: NormalizedFlightOffer[],
): DedupedOfferGroup[] {
  const map = new Map<string, NormalizedFlightOffer[]>();

  for (const raw of offers) {
    const offer = ensureItineraryHash(raw);
    const list = map.get(offer.itineraryHash) ?? [];
    list.push(offer);
    map.set(offer.itineraryHash, list);
  }

  const groups: DedupedOfferGroup[] = [];
  for (const [itineraryHash, list] of map) {
    let best = list[0]!;
    for (const offer of list.slice(1)) {
      if (isPreferable(offer, best)) best = offer;
    }
    const alternatives = list.filter((o) => o.id !== best.id);
    groups.push({ itineraryHash, bestOffer: best, alternatives });
  }

  return groups.sort(
    (a, b) => offerSortKey(a.bestOffer) - offerSortKey(b.bestOffer),
  );
}

export function flattenGroups(
  groups: DedupedOfferGroup[],
): NormalizedFlightOffer[] {
  return groups.map((g) => g.bestOffer);
}
