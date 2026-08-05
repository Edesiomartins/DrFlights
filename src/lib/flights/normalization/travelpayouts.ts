import { finalizeOffer } from "@/lib/flights/normalization/helpers";
import type { FlightSearchInput, NormalizedFlightOffer } from "@/lib/flights/types";

type Row = { origin?: string; destination?: string; depart_date?: string; return_date?: string; value?: number; price?: number; airline?: string; flight_number?: string; duration?: number; transfers?: number; link?: string };

export function normalizeTravelpayoutsPayload(raw: unknown, input: FlightSearchInput, marker?: string): NormalizedFlightOffer[] {
  const payload = raw as { data?: Row[] };
  return (payload.data ?? []).flatMap((row, index) => {
    const first = input.slices[0];
    if (!first) return [];
    const amount = Number(row.value ?? row.price);
    if (!Number.isFinite(amount) || amount <= 0) return [];
    const origin = row.origin ?? first.origin;
    const destination = row.destination ?? first.destination;
    const departureDate = row.depart_date ?? first.departureDate;
    const departureAt = `${departureDate}T00:00:00.000Z`;
    const duration = Math.max(0, Number(row.duration ?? 0));
    const arrivalAt = new Date(Date.parse(departureAt) + duration * 60000).toISOString();
    const carrier = row.airline ?? "Aviasales";
    const stops = Math.max(0, Number(row.transfers ?? 0));
    const params = new URLSearchParams({ origin_iata: origin, destination_iata: destination, depart_date: departureDate });
    if (marker) params.set("marker", marker);
    const bookingUrl = row.link?.startsWith("http") ? row.link : `https://www.aviasales.com/search?${params}`;
    const slice = { origin, destination, departureAt, arrivalAt, durationMinutes: duration, stops, stopAirports: [], segments: [{ origin, destination, departureAt, arrivalAt, durationMinutes: duration, flightNumber: row.flight_number ?? `${carrier}-${index + 1}`, marketingCarrier: carrier, marketingCarrierCode: row.airline }] };
    return [finalizeOffer({ provider: "travelpayouts", providerOfferId: `${origin}-${destination}-${departureDate}-${amount}-${index}`, priceType: "cash", totalAmount: amount, currency: "BRL", airlineName: carrier, airlineCode: row.airline, operatingCarriers: row.airline ? [row.airline] : [], cabin: input.cabin, slices: [slice], totalDurationMinutes: duration, totalStops: stops, bookingUrl })];
  });
}
