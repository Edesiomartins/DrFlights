import { finalizeOffer } from "@/lib/flights/normalization/helpers";
import { parseIsoDurationToMinutes } from "@/lib/utils/duration";
import type { NormalizedFlightOffer } from "@/lib/flights/types";

type Segment = { id?: string; departure?: { iataCode?: string; at?: string }; arrival?: { iataCode?: string; at?: string }; carrierCode?: string; number?: string; duration?: string; aircraft?: { code?: string }; operating?: { carrierCode?: string } };
type Offer = { id?: string; itineraries?: Array<{ duration?: string; segments?: Segment[] }>; price?: { total?: string; currency?: string }; validatingAirlineCodes?: string[]; travelerPricings?: Array<{ fareDetailsBySegment?: Array<{ cabin?: string; includedCheckedBags?: { quantity?: number; weight?: number; weightUnit?: string } }> }> };
export function normalizeAmadeusPayload(raw: unknown): NormalizedFlightOffer[] {
  const payload = raw as { data?: Offer[]; dictionaries?: { carriers?: Record<string,string> } };
  return (payload.data ?? []).flatMap((offer) => {
    if (!offer.id || !offer.itineraries?.length) return [];
    const slices = offer.itineraries.map((it) => { const segments = (it.segments ?? []).map((s) => ({ origin: s.departure?.iataCode ?? "", destination: s.arrival?.iataCode ?? "", departureAt: s.departure?.at ?? "", arrivalAt: s.arrival?.at ?? "", durationMinutes: parseIsoDurationToMinutes(s.duration), flightNumber: `${s.carrierCode ?? ""}${s.number ?? ""}`, marketingCarrier: payload.dictionaries?.carriers?.[s.carrierCode ?? ""] ?? s.carrierCode ?? "Companhia", marketingCarrierCode: s.carrierCode, operatingCarrierCode: s.operating?.carrierCode, aircraft: s.aircraft?.code })); return { origin: segments[0]?.origin ?? "", destination: segments.at(-1)?.destination ?? "", departureAt: segments[0]?.departureAt ?? "", arrivalAt: segments.at(-1)?.arrivalAt ?? "", durationMinutes: parseIsoDurationToMinutes(it.duration), stops: Math.max(0, segments.length - 1), stopAirports: segments.slice(0,-1).map((s) => s.destination), segments }; });
    const code = offer.validatingAirlineCodes?.[0] ?? slices[0]?.segments[0]?.marketingCarrierCode;
    const bag = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
    return [finalizeOffer({ provider: "amadeus", providerOfferId: offer.id, priceType: "cash", totalAmount: Number(offer.price?.total), currency: offer.price?.currency, airlineName: payload.dictionaries?.carriers?.[code ?? ""] ?? code ?? "Companhia", airlineCode: code, operatingCarriers: [...new Set(slices.flatMap((s) => s.segments.map((x) => x.operatingCarrierCode ?? x.marketingCarrierCode).filter(Boolean) as string[]))], cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() ?? "economy", slices, totalDurationMinutes: slices.reduce((a,s)=>a+s.durationMinutes,0), totalStops: slices.reduce((a,s)=>a+s.stops,0), baggage: { checked: bag?.quantity != null ? `${bag.quantity} despachada` : bag?.weight ? `${bag.weight}${bag.weightUnit ?? "KG"}` : undefined } })];
  }).filter((o) => Number.isFinite(o.totalAmount));
}
