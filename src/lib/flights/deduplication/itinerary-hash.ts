import type { FlightSlice, NormalizedFlightOffer } from "@/lib/flights/types";
import { sha256 } from "@/lib/utils/hash";

function segmentSignature(slice: FlightSlice): string {
  return slice.segments
    .map(
      (s) =>
        [
          s.flightNumber.toUpperCase(),
          s.origin.toUpperCase(),
          s.destination.toUpperCase(),
          s.departureAt,
          s.arrivalAt,
        ].join("|"),
    )
    .join(">");
}

/**
 * Stable hash of the physical itinerary (flights + times + cabin).
 * Price/provider/baggage rules are intentionally excluded so sources can be grouped.
 */
export function buildItineraryHash(
  slices: FlightSlice[],
  cabin: string,
): string {
  const payload = [
    cabin.toLowerCase(),
    ...slices.map((slice) => segmentSignature(slice)),
  ].join("::");
  return sha256(payload).slice(0, 32);
}

export function ensureItineraryHash(
  offer: NormalizedFlightOffer,
): NormalizedFlightOffer {
  if (offer.itineraryHash) return offer;
  return {
    ...offer,
    itineraryHash: buildItineraryHash(offer.slices, offer.cabin),
  };
}
