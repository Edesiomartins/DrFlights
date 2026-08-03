import type { Page } from "@playwright/test";

export const mockSearchResponse = {
  searchId: "e2e-search",
  cached: false,
  requestHash: "e2e-hash",
  offers: [
    {
      id: "offer-cheap",
      provider: "duffel",
      providerOfferId: "o1",
      priceType: "cash",
      totalAmount: 450,
      currency: "BRL",
      airlineName: "LATAM",
      airlineCode: "LA",
      operatingCarriers: ["LA"],
      cabin: "economy",
      slices: [
        {
          origin: "GRU",
          destination: "GIG",
          departureAt: "2026-09-10T08:00:00",
          arrivalAt: "2026-09-10T09:10:00",
          durationMinutes: 70,
          stops: 0,
          stopAirports: [],
          segments: [
            {
              origin: "GRU",
              destination: "GIG",
              departureAt: "2026-09-10T08:00:00",
              arrivalAt: "2026-09-10T09:10:00",
              durationMinutes: 70,
              flightNumber: "LA3000",
              marketingCarrier: "LATAM",
              marketingCarrierCode: "LA",
            },
          ],
        },
      ],
      totalDurationMinutes: 70,
      totalStops: 0,
      baggage: { carryOn: "1pc", checked: "1pc" },
      bookingUrl: "https://example.com/book/cheap",
      observedAt: "2026-08-03T12:00:00Z",
      itineraryHash: "hash-cheap",
    },
    {
      id: "offer-value",
      provider: "kiwi",
      providerOfferId: "o2",
      priceType: "cash",
      totalAmount: 520,
      currency: "BRL",
      airlineName: "GOL",
      airlineCode: "G3",
      operatingCarriers: ["G3"],
      cabin: "economy",
      slices: [
        {
          origin: "GRU",
          destination: "GIG",
          departureAt: "2026-09-10T10:00:00",
          arrivalAt: "2026-09-10T11:05:00",
          durationMinutes: 65,
          stops: 0,
          stopAirports: [],
          segments: [
            {
              origin: "GRU",
              destination: "GIG",
              departureAt: "2026-09-10T10:00:00",
              arrivalAt: "2026-09-10T11:05:00",
              durationMinutes: 65,
              flightNumber: "G3100",
              marketingCarrier: "GOL",
              marketingCarrierCode: "G3",
            },
          ],
        },
      ],
      totalDurationMinutes: 65,
      totalStops: 0,
      baggage: { carryOn: "1pc" },
      bookingUrl: "https://example.com/book/value",
      observedAt: "2026-08-03T12:00:00Z",
      itineraryHash: "hash-value",
    },
    {
      id: "offer-stop",
      provider: "ignav",
      providerOfferId: "o3",
      priceType: "cash",
      totalAmount: 390,
      currency: "BRL",
      airlineName: "Azul",
      airlineCode: "AD",
      operatingCarriers: ["AD"],
      cabin: "economy",
      slices: [
        {
          origin: "GRU",
          destination: "GIG",
          departureAt: "2026-09-10T06:00:00",
          arrivalAt: "2026-09-10T10:30:00",
          durationMinutes: 270,
          stops: 1,
          stopAirports: ["CNF"],
          segments: [
            {
              origin: "GRU",
              destination: "CNF",
              departureAt: "2026-09-10T06:00:00",
              arrivalAt: "2026-09-10T07:20:00",
              durationMinutes: 80,
              flightNumber: "AD4000",
              marketingCarrier: "Azul",
              marketingCarrierCode: "AD",
            },
            {
              origin: "CNF",
              destination: "GIG",
              departureAt: "2026-09-10T09:00:00",
              arrivalAt: "2026-09-10T10:30:00",
              durationMinutes: 90,
              flightNumber: "AD4001",
              marketingCarrier: "Azul",
              marketingCarrierCode: "AD",
            },
          ],
        },
      ],
      totalDurationMinutes: 270,
      totalStops: 1,
      bookingUrl: "https://example.com/book/stop",
      observedAt: "2026-08-03T12:00:00Z",
      itineraryHash: "hash-stop",
    },
  ],
  groups: [],
  providerStatuses: [
    {
      provider: "duffel",
      status: "success",
      offers: [],
      durationMs: 120,
    },
    {
      provider: "kiwi",
      status: "success",
      offers: [],
      durationMs: 90,
    },
    {
      provider: "ignav",
      status: "error",
      offers: [],
      durationMs: 20000,
      error: {
        code: "TIMEOUT",
        message: "Tempo limite excedido.",
        retryable: true,
      },
    },
  ],
  highlights: {
    cheapestId: "offer-stop",
    fastestId: "offer-value",
    bestValueId: "offer-cheap",
    bestValueReasons: [
      "Preço competitivo em relação à mediana",
      "Voo direto (sem escalas)",
      "Bagagem considerada na pontuação",
      "Sem self-transfer",
    ],
  },
};

export async function mockFlightSearch(page: Page) {
  await page.route("**/api/flights/search", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSearchResponse),
    });
  });
}

export async function dismissCookieBannerIfPresent(page: Page) {
  const banner = page.getByTestId("cookie-banner");
  if (await banner.isVisible().catch(() => false)) {
    await page.getByTestId("cookie-reject-ads").click();
  }
}

export function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}
