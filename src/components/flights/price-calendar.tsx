"use client";

import { useEffect, useMemo, useState } from "react";

type Day = {
  date: string;
  price: number;
};

type CalendarResponse = {
  days: Day[];
  emptyReason?: string;
  currency: string;
};

type Props = {
  origin: string;
  destination: string;
};

export function PriceCalendar({ origin, destination }: Props) {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/price-calendar?origin=${origin}&destination=${destination}`,
        );
        if (!res.ok) {
          if (!cancelled) setError("Não foi possível carregar o calendário.");
          return;
        }
        const json = (await res.json()) as CalendarResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Falha de rede ao carregar o calendário.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  const minPrice = useMemo(() => {
    if (!data?.days.length) return null;
    return Math.min(...data.days.map((d) => d.price));
  }, [data]);

  if (loading) {
    return (
      <div className="glass content-card" data-testid="price-calendar">
        Carregando calendário…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass content-card" data-testid="price-calendar">
        {error}
      </div>
    );
  }

  if (!data?.days.length) {
    return (
      <div className="glass empty-card" data-testid="price-calendar">
        {data?.emptyReason ??
          "Sem preços de calendário disponíveis para esta rota."}
      </div>
    );
  }

  return (
    <div className="glass content-card price-calendar" data-testid="price-calendar">
      <p className="text-muted">
        Preços reais Travelpayouts · moeda {data.currency}
        {minPrice != null
          ? ` · menor dia R$ ${minPrice.toLocaleString("pt-BR")}`
          : ""}
      </p>
      <div className="price-calendar-grid">
        {data.days.map((day) => {
          const isCheapest = minPrice != null && day.price === minPrice;
          return (
            <div
              key={day.date}
              className={`price-calendar-day${isCheapest ? " is-cheapest" : ""}`}
            >
              <span>
                {new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <strong>
                {day.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: data.currency || "BRL",
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
