import type {
  FlightSlice,
  NormalizedFlightOffer,
} from "@/lib/flights/types";
import { finalizeOffer } from "@/lib/flights/normalization/helpers";

type IgnavSegment = {
  marketing_carrier_code?: string;
  flight_number?: string | number;
  departure_airport?: string;
  departure_time_local?: string;
  arrival_airport?: string;
  arrival_time_local?: string;
  duration_minutes?: number;
  aircraft?: string;
  operating_carrier_code?: string;
};

type IgnavLeg = {
  carrier?: string;
  duration_minutes?: number;
  segments?: IgnavSegment[];
};

type IgnavItinerary = {
  ignav_id?: string;
  price?: { amount?: number; currency?: string };
  outbound?: IgnavLeg | null;
  inbound?: IgnavLeg | null;
  cabin_class?: string;
  bags?: { carry_on?: number; checked?: number };
  booking_url?: string;
};

function mapLeg(leg: IgnavLeg): FlightSlice {
  const segments = (leg.segments ?? []).map((seg) => {
    const code = seg.marketing_carrier_code ?? "";
    const num = String(seg.flight_number ?? "");
    return {
      origin: (seg.departure_airport ?? "").toUpperCase(),
      destination: (seg.arrival_airport ?? "").toUpperCase(),
      departureAt: seg.departure_time_local ?? "",
      arrivalAt: seg.arrival_time_local ?? "",
      durationMinutes: seg.duration_minutes ?? 0,
      flightNumber: `${code}${num}`.replace(/\s+/g, "") || "UNKNOWN",
      marketingCarrier: code || leg.carrier || "Desconhecida",
      marketingCarrierCode: code || undefined,
      operatingCarrierCode: seg.operating_carrier_code,
      aircraft: seg.aircraft,
    };
  });

  return {
    origin: segments[0]?.origin ?? "",
    destination: segments[segments.length - 1]?.destination ?? "",
    departureAt: segments[0]?.departureAt ?? "",
    arrivalAt: segments[segments.length - 1]?.arrivalAt ?? "",
    durationMinutes:
      leg.duration_minutes ??
      segments.reduce((acc, s) => acc + s.durationMinutes, 0),
    stops: Math.max(0, segments.length - 1),
    stopAirports:
      segments.length > 1
        ? segments.slice(0, -1).map((s) => s.destination)
        : [],
    segments,
  };
}

export function normalizeIgnavItinerary(
  raw: unknown,
): NormalizedFlightOffer | null {
  const item = raw as IgnavItinerary;
  if (!item?.ignav_id || !item.outbound) return null;

  const slices: FlightSlice[] = [mapLeg(item.outbound)];
  if (item.inbound) slices.push(mapLeg(item.inbound));

  const operatingCarriers = [
    ...new Set(
      slices.flatMap((s) =>
        s.segments
          .map((seg) => seg.operatingCarrierCode ?? seg.marketingCarrierCode)
          .filter((c): c is string => Boolean(c)),
      ),
    ),
  ];

  return finalizeOffer({
    provider: "ignav",
    providerOfferId: item.ignav_id,
    priceType: "cash",
    totalAmount: item.price?.amount,
    currency: item.price?.currency,
    airlineName:
      item.outbound.carrier ??
      slices[0]?.segments[0]?.marketingCarrier ??
      "Companhia",
    airlineCode: slices[0]?.segments[0]?.marketingCarrierCode,
    operatingCarriers,
    cabin: item.cabin_class ?? "economy",
    slices,
    totalDurationMinutes: slices.reduce((a, s) => a + s.durationMinutes, 0),
    totalStops: slices.reduce((a, s) => a + s.stops, 0),
    baggage: {
      carryOn:
        item.bags?.carry_on != null
          ? `${item.bags.carry_on} mão`
          : undefined,
      checked:
        item.bags?.checked != null
          ? `${item.bags.checked} despachada`
          : undefined,
    },
    bookingUrl: item.booking_url,
  });
}

export function normalizeIgnavItineraries(
  items: unknown[],
): NormalizedFlightOffer[] {
  const out: NormalizedFlightOffer[] = [];
  for (const item of items) {
    const n = normalizeIgnavItinerary(item);
    if (n) out.push(n);
  }
  return out;
}
