import type {
  FlightSlice,
  NormalizedFlightOffer,
} from "@/lib/flights/types";
import { finalizeOffer } from "@/lib/flights/normalization/helpers";

/**
 * Skiplagged MCP may return structured JSON or loose objects.
 * This normalizer accepts several shapes without inventing prices.
 */
type LooseSegment = {
  origin?: string;
  from?: string;
  destination?: string;
  to?: string;
  departure?: string;
  departureAt?: string;
  departure_time?: string;
  arrival?: string;
  arrivalAt?: string;
  arrival_time?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  flightNumber?: string;
  flight_number?: string;
  airline?: string;
  airlineCode?: string;
  airline_code?: string;
  marketingCarrier?: string;
};

type LooseFlight = {
  id?: string;
  price?: number | { amount?: number; currency?: string };
  currency?: string;
  airline?: string;
  airlineCode?: string;
  bookingUrl?: string;
  booking_url?: string;
  deep_link?: string;
  url?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  stops?: number;
  cabin?: string;
  hiddenCity?: boolean;
  hidden_city?: boolean;
  virtualInterlining?: boolean;
  virtual_interlining?: boolean;
  outbound?: { segments?: LooseSegment[]; durationMinutes?: number; stops?: number };
  inbound?: { segments?: LooseSegment[]; durationMinutes?: number; stops?: number };
  segments?: LooseSegment[];
  legs?: Array<{ segments?: LooseSegment[] }>;
};

function asAmount(price: LooseFlight["price"]): {
  amount?: number;
  currency?: string;
} {
  if (typeof price === "number") return { amount: price };
  if (price && typeof price === "object") {
    return { amount: price.amount, currency: price.currency };
  }
  return {};
}

function mapSegment(seg: LooseSegment) {
  const code = seg.airlineCode ?? seg.airline_code ?? "";
  const num = String(seg.flightNumber ?? seg.flight_number ?? "");
  return {
    origin: (seg.origin ?? seg.from ?? "").toUpperCase(),
    destination: (seg.destination ?? seg.to ?? "").toUpperCase(),
    departureAt:
      seg.departureAt ?? seg.departure ?? seg.departure_time ?? "",
    arrivalAt: seg.arrivalAt ?? seg.arrival ?? seg.arrival_time ?? "",
    durationMinutes: seg.durationMinutes ?? seg.duration_minutes ?? 0,
    flightNumber: `${code}${num}`.replace(/\s+/g, "") || "UNKNOWN",
    marketingCarrier: seg.marketingCarrier ?? seg.airline ?? (code || "Companhia"),
    marketingCarrierCode: code || undefined,
  };
}

function slicesFromFlight(flight: LooseFlight): FlightSlice[] {
  if (flight.outbound?.segments?.length) {
    const slices: FlightSlice[] = [];
    const outSegs = flight.outbound.segments.map(mapSegment);
    slices.push({
      origin: outSegs[0]?.origin ?? "",
      destination: outSegs[outSegs.length - 1]?.destination ?? "",
      departureAt: outSegs[0]?.departureAt ?? "",
      arrivalAt: outSegs[outSegs.length - 1]?.arrivalAt ?? "",
      durationMinutes:
        flight.outbound.durationMinutes ??
        outSegs.reduce((a, s) => a + s.durationMinutes, 0),
      stops: flight.outbound.stops ?? Math.max(0, outSegs.length - 1),
      stopAirports:
        outSegs.length > 1
          ? outSegs.slice(0, -1).map((s) => s.destination)
          : [],
      segments: outSegs,
    });
    if (flight.inbound?.segments?.length) {
      const inSegs = flight.inbound.segments.map(mapSegment);
      slices.push({
        origin: inSegs[0]?.origin ?? "",
        destination: inSegs[inSegs.length - 1]?.destination ?? "",
        departureAt: inSegs[0]?.departureAt ?? "",
        arrivalAt: inSegs[inSegs.length - 1]?.arrivalAt ?? "",
        durationMinutes:
          flight.inbound.durationMinutes ??
          inSegs.reduce((a, s) => a + s.durationMinutes, 0),
        stops: flight.inbound.stops ?? Math.max(0, inSegs.length - 1),
        stopAirports:
          inSegs.length > 1
            ? inSegs.slice(0, -1).map((s) => s.destination)
            : [],
        segments: inSegs,
      });
    }
    return slices;
  }

  const segs = (flight.segments ?? flight.legs?.[0]?.segments ?? []).map(
    mapSegment,
  );
  if (segs.length === 0) return [];
  return [
    {
      origin: segs[0]?.origin ?? "",
      destination: segs[segs.length - 1]?.destination ?? "",
      departureAt: segs[0]?.departureAt ?? "",
      arrivalAt: segs[segs.length - 1]?.arrivalAt ?? "",
      durationMinutes:
        flight.durationMinutes ??
        flight.duration_minutes ??
        segs.reduce((a, s) => a + s.durationMinutes, 0),
      stops: flight.stops ?? Math.max(0, segs.length - 1),
      stopAirports:
        segs.length > 1 ? segs.slice(0, -1).map((s) => s.destination) : [],
      segments: segs,
    },
  ];
}

function extractFlights(raw: unknown): LooseFlight[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.flights)) return obj.flights as LooseFlight[];
  if (Array.isArray(obj.itineraries)) return obj.itineraries as LooseFlight[];
  if (Array.isArray(obj.results)) return obj.results as LooseFlight[];
  if (Array.isArray(raw)) return raw as LooseFlight[];
  return [];
}

export function normalizeSkiplaggedPayload(
  raw: unknown,
): NormalizedFlightOffer[] {
  const flights = extractFlights(raw);
  const out: NormalizedFlightOffer[] = [];

  for (const [index, flight] of flights.entries()) {
    const { amount, currency } = asAmount(flight.price);
    if (amount == null || !Number.isFinite(amount)) continue;

    const slices = slicesFromFlight(flight);
    if (slices.length === 0) continue;

    const hiddenCity = Boolean(flight.hiddenCity ?? flight.hidden_city);
    const virtual = Boolean(
      flight.virtualInterlining ?? flight.virtual_interlining,
    );

    out.push(
      finalizeOffer({
        provider: "skiplagged",
        providerOfferId: String(flight.id ?? `sk-${index}`),
        priceType: "cash",
        totalAmount: amount,
        currency: currency ?? flight.currency ?? "USD",
        airlineName:
          flight.airline ??
          slices[0]?.segments[0]?.marketingCarrier ??
          "Skiplagged",
        airlineCode:
          flight.airlineCode ?? slices[0]?.segments[0]?.marketingCarrierCode,
        operatingCarriers: [
          ...new Set(
            slices.flatMap((s) =>
              s.segments
                .map((seg) => seg.marketingCarrierCode)
                .filter((c): c is string => Boolean(c)),
            ),
          ),
        ],
        cabin: flight.cabin ?? "economy",
        slices,
        totalDurationMinutes: slices.reduce((a, s) => a + s.durationMinutes, 0),
        totalStops: slices.reduce((a, s) => a + s.stops, 0),
        bookingUrl:
          flight.bookingUrl ??
          flight.booking_url ??
          flight.deep_link ??
          flight.url,
        separateTickets: virtual || hiddenCity || undefined,
      }),
    );
  }

  return out;
}
