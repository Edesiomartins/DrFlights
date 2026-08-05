import { assertTravelpayoutsQuota } from "@/lib/flights/providers/travelpayouts-quota";
import {
  getTravelpayoutsMarker,
  getTravelpayoutsToken,
} from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type CalendarDayPrice = {
  date: string;
  price: number;
  transfers?: number;
  airline?: string;
  departureAt?: string;
  returnAt?: string | null;
  link?: string;
};

export type PriceCalendarResult = {
  origin: string;
  destination: string;
  currency: string;
  days: CalendarDayPrice[];
  source: "travelpayouts";
  emptyReason?: string;
};

/**
 * Real calendar prices from Travelpayouts month-matrix (no fabricated data).
 */
export async function fetchTravelpayoutsCalendar(input: {
  origin: string;
  destination: string;
  currency?: string;
  month?: string;
}): Promise<PriceCalendarResult> {
  const origin = input.origin.toUpperCase();
  const destination = input.destination.toUpperCase();
  const currency = (input.currency ?? "BRL").toLowerCase();
  const token = getTravelpayoutsToken();
  const marker = getTravelpayoutsMarker();

  const empty = (reason: string): PriceCalendarResult => ({
    origin,
    destination,
    currency: currency.toUpperCase(),
    days: [],
    source: "travelpayouts",
    emptyReason: reason,
  });

  if (!token) {
    return empty("Travelpayouts não configurado");
  }

  try {
    assertTravelpayoutsQuota();
  } catch {
    return empty("Cota Travelpayouts atingida; tente novamente em breve");
  }

  const params = new URLSearchParams({
    currency,
    origin,
    destination,
    show_to_affiliates: "true",
    token,
  });
  if (input.month) params.set("month", input.month);
  if (marker) params.set("marker", marker);

  try {
    const response = await fetch(
      `https://api.travelpayouts.com/v2/prices/month-matrix?${params}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } },
    );
    if (!response.ok) {
      logger.warn("calendar.travelpayouts_http", {
        status: response.status,
        origin,
        destination,
      });
      return empty(`Travelpayouts HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      success?: boolean;
      data?: Array<{
        depart_date?: string;
        value?: number;
        number_of_changes?: number;
        airline?: string;
        found_at?: string;
        return_date?: string | null;
        gate?: string;
      }>;
    };

    const rows = Array.isArray(json.data) ? json.data : [];
    const byDate = new Map<string, CalendarDayPrice>();

    for (const row of rows) {
      const date = row.depart_date;
      const price = row.value;
      if (!date || price == null || !Number.isFinite(price) || price <= 0) {
        continue;
      }
      const current = byDate.get(date);
      if (!current || price < current.price) {
        byDate.set(date, {
          date,
          price,
          transfers: row.number_of_changes,
          airline: row.airline,
          departureAt: date,
          returnAt: row.return_date ?? null,
        });
      }
    }

    const days = [...byDate.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    if (days.length === 0) {
      return empty("Sem preços retornados para esta rota no período");
    }

    return {
      origin,
      destination,
      currency: currency.toUpperCase(),
      days,
      source: "travelpayouts",
    };
  } catch (error) {
    logger.error("calendar.travelpayouts_failed", {
      error: error instanceof Error ? error.message : "unknown",
      origin,
      destination,
    });
    return empty("Falha ao consultar calendário de preços");
  }
}
