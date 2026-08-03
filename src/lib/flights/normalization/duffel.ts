import type {
  FlightSlice,
  NormalizedFlightOffer,
} from "@/lib/flights/types";
import { parseIsoDurationToMinutes } from "@/lib/utils/duration";
import { finalizeOffer } from "@/lib/flights/normalization/helpers";

type DuffelPlace = { iata_code?: string; name?: string };
type DuffelCarrier = { iata_code?: string; name?: string };
type DuffelBaggage = { type?: string; quantity?: number };
type DuffelPassenger = {
  cabin_class?: string;
  baggages?: DuffelBaggage[];
};
type DuffelSegment = {
  origin?: DuffelPlace;
  destination?: DuffelPlace;
  departing_at?: string;
  arriving_at?: string;
  duration?: string;
  marketing_carrier?: DuffelCarrier;
  marketing_carrier_flight_number?: string;
  operating_carrier?: DuffelCarrier;
  passengers?: DuffelPassenger[];
  aircraft?: { name?: string };
};
type DuffelSlice = {
  origin?: DuffelPlace;
  destination?: DuffelPlace;
  duration?: string;
  segments?: DuffelSegment[];
};
type DuffelOffer = {
  id?: string;
  total_amount?: string;
  total_currency?: string;
  tax_amount?: string;
  tax_currency?: string;
  expires_at?: string;
  owner?: DuffelCarrier;
  conditions?: {
    refund_before_departure?: { allowed?: boolean };
    change_before_departure?: { allowed?: boolean };
  };
  slices?: DuffelSlice[];
};

function baggageSummary(offer: DuffelOffer): {
  carryOn?: string;
  checked?: string;
} {
  const bags =
    offer.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages ?? [];
  const carry = bags.find((b) => b.type === "carry_on");
  const checked = bags.find((b) => b.type === "checked");
  return {
    carryOn:
      carry?.quantity != null ? `${carry.quantity} mão` : undefined,
    checked:
      checked?.quantity != null ? `${checked.quantity} despachada` : undefined,
  };
}

function mapSlice(slice: DuffelSlice): FlightSlice {
  const segments = (slice.segments ?? []).map((seg) => {
    const flightNumber = [
      seg.marketing_carrier?.iata_code ?? "",
      seg.marketing_carrier_flight_number ?? "",
    ]
      .join("")
      .replace(/\s+/g, "");

    return {
      origin: seg.origin?.iata_code ?? "",
      destination: seg.destination?.iata_code ?? "",
      departureAt: seg.departing_at ?? "",
      arrivalAt: seg.arriving_at ?? "",
      durationMinutes: parseIsoDurationToMinutes(seg.duration),
      flightNumber: flightNumber || "UNKNOWN",
      marketingCarrier: seg.marketing_carrier?.name ?? "Desconhecida",
      marketingCarrierCode: seg.marketing_carrier?.iata_code,
      operatingCarrier: seg.operating_carrier?.name,
      operatingCarrierCode: seg.operating_carrier?.iata_code,
      aircraft: seg.aircraft?.name,
    };
  });

  const stopAirports =
    segments.length > 1
      ? segments.slice(0, -1).map((s) => s.destination)
      : [];

  return {
    origin: slice.origin?.iata_code ?? segments[0]?.origin ?? "",
    destination:
      slice.destination?.iata_code ??
      segments[segments.length - 1]?.destination ??
      "",
    departureAt: segments[0]?.departureAt ?? "",
    arrivalAt: segments[segments.length - 1]?.arrivalAt ?? "",
    durationMinutes: parseIsoDurationToMinutes(slice.duration),
    stops: Math.max(0, segments.length - 1),
    stopAirports,
    segments,
  };
}

export function normalizeDuffelOffer(raw: unknown): NormalizedFlightOffer | null {
  const offer = raw as DuffelOffer;
  if (!offer?.id || !offer.slices?.length) return null;

  const slices = offer.slices.map(mapSlice);
  const cabin =
    offer.slices[0]?.segments?.[0]?.passengers?.[0]?.cabin_class ?? "economy";
  const operatingCarriers = [
    ...new Set(
      slices.flatMap((s) =>
        s.segments
          .map((seg) => seg.operatingCarrierCode ?? seg.marketingCarrierCode)
          .filter((c): c is string => Boolean(c)),
      ),
    ),
  ];

  const totalDurationMinutes = slices.reduce(
    (acc, s) => acc + s.durationMinutes,
    0,
  );
  const totalStops = slices.reduce((acc, s) => acc + s.stops, 0);
  const bags = baggageSummary(offer);

  return finalizeOffer({
    provider: "duffel",
    providerOfferId: offer.id,
    priceType: "cash",
    totalAmount: offer.total_amount ? Number(offer.total_amount) : undefined,
    currency: offer.total_currency,
    taxesAmount: offer.tax_amount ? Number(offer.tax_amount) : undefined,
    taxesCurrency: offer.tax_currency,
    airlineName: offer.owner?.name ?? slices[0]?.segments[0]?.marketingCarrier ?? "Companhia",
    airlineCode: offer.owner?.iata_code,
    operatingCarriers,
    cabin,
    slices,
    totalDurationMinutes,
    totalStops,
    baggage: bags,
    refundable: offer.conditions?.refund_before_departure?.allowed,
    changeable: offer.conditions?.change_before_departure?.allowed,
    expiresAt: offer.expires_at,
    bookingUrl: undefined,
  });
}

export function normalizeDuffelOffers(rawOffers: unknown[]): NormalizedFlightOffer[] {
  const out: NormalizedFlightOffer[] = [];
  for (const item of rawOffers) {
    const normalized = normalizeDuffelOffer(item);
    if (normalized) out.push(normalized);
  }
  return out;
}
