export type CabinClass =
  | "economy"
  | "premium_economy"
  | "business"
  | "first";

export type TripType = "one_way" | "round_trip" | "multi_city";

export type FlightSegment = {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  flightNumber: string;
  marketingCarrier: string;
  marketingCarrierCode?: string;
  operatingCarrier?: string;
  operatingCarrierCode?: string;
  aircraft?: string;
};

export type FlightSlice = {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  stopAirports: string[];
  segments: FlightSegment[];
};

export type NormalizedFlightOffer = {
  id: string;
  provider: string;
  providerOfferId: string;
  priceType: "cash" | "points";
  totalAmount?: number;
  currency?: string;
  pointsAmount?: number;
  pointsProgram?: string;
  taxesAmount?: number;
  taxesCurrency?: string;
  airlineName: string;
  airlineCode?: string;
  operatingCarriers: string[];
  cabin: string;
  slices: FlightSlice[];
  totalDurationMinutes: number;
  totalStops: number;
  baggage?: {
    carryOn?: string;
    checked?: string;
  };
  refundable?: boolean;
  changeable?: boolean;
  expiresAt?: string;
  bookingUrl?: string;
  observedAt: string;
  itineraryHash: string;
  /** Separate one-way tickets combined client-side / orchestrator */
  separateTickets?: boolean;
  /** Seats.aero freshness warning */
  stale?: boolean;
  lastSeenAt?: string;
  remainingSeats?: number;
  transferPaths?: string[];
  estimatedCpp?: number;
  promotionLabel?: string;
  promotionMeta?: {
    currentPrice: number;
    medianPrice: number;
    percentDiff: number;
    sampleCount: number;
    periodDays: number;
  };
};

export type FlightSearchSliceInput = {
  origin: string;
  destination: string;
  departureDate: string;
};

export type FlightSearchInput = {
  tripType: TripType;
  slices: FlightSearchSliceInput[];
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
  maxStops?: number;
  currency?: string;
  compareSeparateLegs?: boolean;
  market?: string;
};

export type ProviderError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type ProviderSearchResult = {
  provider: string;
  status: "success" | "partial" | "error" | "disabled" | "circuit_open";
  offers: NormalizedFlightOffer[];
  durationMs: number;
  error?: ProviderError;
};

export type ProviderHealthResult = {
  provider: string;
  configured: boolean;
  enabled: boolean;
  ok: boolean;
  latencyMs?: number;
  message: string;
};

export interface FlightProvider {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;

  search(input: FlightSearchInput): Promise<ProviderSearchResult>;
  healthCheck(): Promise<ProviderHealthResult>;
}

export type DedupedOfferGroup = {
  itineraryHash: string;
  bestOffer: NormalizedFlightOffer;
  alternatives: NormalizedFlightOffer[];
};

export type SortMode =
  | "price"
  | "duration"
  | "stops"
  | "value"
  | "departure";

export type AggregatedSearchResult = {
  searchId: string;
  cached: boolean;
  requestHash: string;
  offers: NormalizedFlightOffer[];
  groups: DedupedOfferGroup[];
  providerStatuses: ProviderSearchResult[];
  highlights: {
    cheapestId?: string;
    fastestId?: string;
    bestValueId?: string;
    bestValueReasons?: string[];
  };
  separateLegsComparison?: {
    roundTripLowest?: number;
    separateLowest?: number;
    currency?: string;
    note: string;
  };
  priceIntel?: {
    sampleCount: number;
    median: number | null;
    p25: number | null;
    p75: number | null;
    weekly: Array<{ week: string; median: number }>;
    classifications: Record<string, "BAIXO" | "TIPICO" | "ALTO">;
  };
  mileageBonuses?: Record<string, number>;
};
