import type { NormalizedFlightOffer } from "@/lib/flights/types";
import { finalizeOffer } from "@/lib/flights/normalization/helpers";

type SeatsAvailability = {
  ID?: string;
  Date?: string;
  Source?: string;
  Route?: { OriginAirport?: string; DestinationAirport?: string };
  YAvailable?: boolean;
  WAvailable?: boolean;
  JAvailable?: boolean;
  FAvailable?: boolean;
  YMileageCost?: string;
  WMileageCost?: string;
  JMileageCost?: string;
  FMileageCost?: string;
  YRemainingSeats?: number;
  WRemainingSeats?: number;
  JRemainingSeats?: number;
  FRemainingSeats?: number;
  YAirlines?: string;
  WAirlines?: string;
  JAirlines?: string;
  FAirlines?: string;
  YDirect?: boolean;
  WDirect?: boolean;
  JDirect?: boolean;
  FDirect?: boolean;
  ComputedLastSeen?: string;
  YTaxes?: string;
  WTaxes?: string;
  JTaxes?: string;
  FTaxes?: string;
};

const CABIN_MAP = {
  economy: {
    avail: "YAvailable",
    miles: "YMileageCost",
    seats: "YRemainingSeats",
    airlines: "YAirlines",
    direct: "YDirect",
    taxes: "YTaxes",
    cabin: "economy",
  },
  premium_economy: {
    avail: "WAvailable",
    miles: "WMileageCost",
    seats: "WRemainingSeats",
    airlines: "WAirlines",
    direct: "WDirect",
    taxes: "WTaxes",
    cabin: "premium_economy",
  },
  business: {
    avail: "JAvailable",
    miles: "JMileageCost",
    seats: "JRemainingSeats",
    airlines: "JAirlines",
    direct: "JDirect",
    taxes: "JTaxes",
    cabin: "business",
  },
  first: {
    avail: "FAvailable",
    miles: "FMileageCost",
    seats: "FRemainingSeats",
    airlines: "FAirlines",
    direct: "FDirect",
    taxes: "FTaxes",
    cabin: "first",
  },
} as const;

function isStale(lastSeen?: string): boolean {
  if (!lastSeen) return true;
  const ts = Date.parse(lastSeen);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > 24 * 60 * 60 * 1000;
}

export function normalizeSeatsAeroAvailability(
  raw: unknown,
  preferredCabin: keyof typeof CABIN_MAP = "economy",
): NormalizedFlightOffer[] {
  const item = raw as SeatsAvailability;
  if (!item?.ID || !item.Route?.OriginAirport || !item.Route?.DestinationAirport) {
    return [];
  }

  const order: Array<keyof typeof CABIN_MAP> = [
    preferredCabin,
    "economy",
    "premium_economy",
    "business",
    "first",
  ];
  const uniqueCabins = [...new Set(order)];
  const results: NormalizedFlightOffer[] = [];

  for (const cabinKey of uniqueCabins) {
    const meta = CABIN_MAP[cabinKey];
    const row = item as unknown as Record<string, unknown>;
    const available = Boolean(row[meta.avail]);
    const milesRaw = String(row[meta.miles] ?? "");
    const miles = Number(milesRaw.replace(/,/g, ""));
    if (!available || !Number.isFinite(miles) || miles <= 0) continue;

    const airlines = String(row[meta.airlines] ?? "");
    const airlineCode = airlines.split(",")[0]?.trim() || undefined;
    const direct = Boolean(row[meta.direct]);
    const seats = Number(row[meta.seats] ?? 0);
    const taxesRaw = Number(String(row[meta.taxes] ?? "0").replace(/,/g, ""));
    const origin = item.Route.OriginAirport.toUpperCase();
    const destination = item.Route.DestinationAirport.toUpperCase();
    const date = item.Date ?? "";
    const departureAt = date ? `${date}T00:00:00` : "";

    results.push(
      finalizeOffer({
        provider: "seats-aero",
        providerOfferId: `${item.ID}:${cabinKey}`,
        priceType: "points",
        pointsAmount: miles,
        pointsProgram: item.Source,
        taxesAmount: Number.isFinite(taxesRaw) ? taxesRaw / 100 : undefined,
        taxesCurrency: "USD",
        airlineName: airlineCode ?? item.Source ?? "Award",
        airlineCode,
        operatingCarriers: airlineCode ? [airlineCode] : [],
        cabin: meta.cabin,
        slices: [
          {
            origin,
            destination,
            departureAt,
            arrivalAt: departureAt,
            durationMinutes: 0,
            stops: direct ? 0 : 1,
            stopAirports: [],
            segments: [
              {
                origin,
                destination,
                departureAt,
                arrivalAt: departureAt,
                durationMinutes: 0,
                flightNumber: `${airlineCode ?? "XX"}AWARD`,
                marketingCarrier: airlineCode ?? item.Source ?? "Award",
                marketingCarrierCode: airlineCode,
              },
            ],
          },
        ],
        totalDurationMinutes: 0,
        totalStops: direct ? 0 : 1,
        bookingUrl: `https://seats.aero/trip?id=${item.ID}`,
        stale: isStale(item.ComputedLastSeen),
        lastSeenAt: item.ComputedLastSeen,
        remainingSeats: Number.isFinite(seats) ? seats : undefined,
      }),
    );
  }

  return results;
}
