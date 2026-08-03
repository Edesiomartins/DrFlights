import { createHash } from "crypto";
import type {
  FlightSearchInput,
  FlightSlice,
  NormalizedFlightOffer,
} from "@/lib/flights/types";
import { buildItineraryHash } from "@/lib/flights/deduplication/itinerary-hash";
import { sha256, stableStringify } from "@/lib/utils/hash";

export function makeOfferId(
  provider: string,
  providerOfferId: string,
  itineraryHash: string,
): string {
  return sha256(`${provider}:${providerOfferId}:${itineraryHash}`).slice(0, 24);
}

export function buildSearchRequestHash(input: FlightSearchInput): string {
  return sha256(stableStringify(input));
}

export function sumSliceDurations(slices: FlightSlice[]): number {
  return slices.reduce((acc, s) => acc + s.durationMinutes, 0);
}

export function sumStops(slices: FlightSlice[]): number {
  return slices.reduce((acc, s) => acc + s.stops, 0);
}

export function stopAirportsFromSegments(
  originsDestinations: Array<{ origin: string; destination: string }>,
): string[] {
  if (originsDestinations.length <= 1) return [];
  return originsDestinations.slice(0, -1).map((s) => s.destination);
}

export function finalizeOffer(
  partial: Omit<NormalizedFlightOffer, "id" | "itineraryHash" | "observedAt"> & {
    observedAt?: string;
    itineraryHash?: string;
  },
): NormalizedFlightOffer {
  const itineraryHash =
    partial.itineraryHash ??
    buildItineraryHash(partial.slices, partial.cabin);
  const observedAt = partial.observedAt ?? new Date().toISOString();
  return {
    ...partial,
    itineraryHash,
    observedAt,
    id: makeOfferId(partial.provider, partial.providerOfferId, itineraryHash),
  };
}

export function fingerprint(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
