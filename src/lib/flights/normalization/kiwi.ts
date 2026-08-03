import type {
  FlightSlice,
  NormalizedFlightOffer,
} from "@/lib/flights/types";
import { finalizeOffer } from "@/lib/flights/normalization/helpers";

type KiwiSegment = {
  from?: string;
  to?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationSeconds?: number;
  carrier?: string;
  carrierName?: string;
  flightNumber?: string;
  cabinClass?: string;
};

type KiwiLeg = {
  from?: string;
  to?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationSeconds?: number;
  stops?: number;
  route?: string[];
  cabinClass?: string;
  segments?: KiwiSegment[];
};

type KiwiItinerary = {
  id?: string;
  price?: number;
  priceFormatted?: string;
  totalDurationSeconds?: number;
  bookingUrl?: string;
  baggage?: {
    personalItem?: number;
    cabinBag?: number;
    checkedBag?: number;
  };
  outbound?: KiwiLeg | null;
  inbound?: KiwiLeg | null;
};

type KiwiSearchPayload = {
  currency?: string;
  itineraries?: KiwiItinerary[];
};

function mapLeg(leg: KiwiLeg): FlightSlice {
  const segments = (leg.segments ?? []).map((seg) => ({
    origin: (seg.from ?? "").toUpperCase(),
    destination: (seg.to ?? "").toUpperCase(),
    departureAt: seg.departureTime ?? "",
    arrivalAt: seg.arrivalTime ?? "",
    durationMinutes: Math.round((seg.durationSeconds ?? 0) / 60),
    flightNumber: (seg.flightNumber ?? `${seg.carrier ?? "XX"}0`).replace(
      /\s+/g,
      "",
    ),
    marketingCarrier: seg.carrierName ?? seg.carrier ?? "Companhia",
    marketingCarrierCode: seg.carrier,
    operatingCarrierCode: seg.carrier,
  }));

  const stopAirports =
    (leg.route ?? []).length > 2
      ? (leg.route ?? []).slice(1, -1)
      : segments.length > 1
        ? segments.slice(0, -1).map((s) => s.destination)
        : [];

  return {
    origin: (leg.from ?? segments[0]?.origin ?? "").toUpperCase(),
    destination: (
      leg.to ??
      segments[segments.length - 1]?.destination ??
      ""
    ).toUpperCase(),
    departureAt: leg.departureTime ?? segments[0]?.departureAt ?? "",
    arrivalAt:
      leg.arrivalTime ?? segments[segments.length - 1]?.arrivalAt ?? "",
    durationMinutes: Math.round((leg.durationSeconds ?? 0) / 60),
    stops: leg.stops ?? Math.max(0, segments.length - 1),
    stopAirports,
    segments,
  };
}

export function normalizeKiwiPayload(raw: unknown): NormalizedFlightOffer[] {
  const payload = raw as KiwiSearchPayload;
  const currency = payload.currency ?? "EUR";
  const list = payload.itineraries ?? [];
  const out: NormalizedFlightOffer[] = [];

  for (const item of list) {
    if (!item?.id || !item.outbound) continue;
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

    const selfTransfer = slices.some((s) =>
      s.segments.some((a, i, arr) => {
        if (i === 0) return false;
        const prev = arr[i - 1];
        return (
          Boolean(prev?.marketingCarrierCode) &&
          Boolean(a.marketingCarrierCode) &&
          prev!.marketingCarrierCode !== a.marketingCarrierCode
        );
      }),
    );

    out.push(
      finalizeOffer({
        provider: "kiwi",
        providerOfferId: item.id,
        priceType: "cash",
        totalAmount: item.price,
        currency,
        airlineName:
          slices[0]?.segments[0]?.marketingCarrier ?? "Kiwi.com",
        airlineCode: slices[0]?.segments[0]?.marketingCarrierCode,
        operatingCarriers,
        cabin: (item.outbound.cabinClass ?? "economy").toLowerCase(),
        slices,
        totalDurationMinutes: Math.round(
          (item.totalDurationSeconds ??
            slices.reduce((a, s) => a + s.durationMinutes, 0) * 60) / 60,
        ),
        totalStops: slices.reduce((a, s) => a + s.stops, 0),
        baggage: {
          carryOn:
            item.baggage?.cabinBag != null
              ? `${item.baggage.cabinBag} cabine`
              : undefined,
          checked:
            item.baggage?.checkedBag != null
              ? `${item.baggage.checkedBag} despachada`
              : undefined,
        },
        bookingUrl: item.bookingUrl,
        separateTickets: selfTransfer || undefined,
      }),
    );
  }

  return out;
}
