"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdSlotCard } from "@/components/ads/ad-slot-card";
import { OfferCard } from "@/components/flights/offer-card";
import { PriceCalendar } from "@/components/flights/price-calendar";
import { ResultsSkeleton } from "@/components/flights/results-skeleton";
import type { AdSlotConfig } from "@/lib/ads/config";
import type {
  AggregatedSearchResult,
  NormalizedFlightOffer,
  SortMode,
} from "@/lib/flights/types";
import { rankOffers } from "@/lib/flights/ranking/value-score";

type Props = {
  queryPayload: unknown;
  inlineAds?: AdSlotConfig[];
};

function providerStatusLabel(status: string): string {
  switch (status) {
    case "success":
      return "ok";
    case "partial":
      return "parcial";
    case "error":
      return "falha";
    case "timeout":
      return "timeout";
    case "disabled":
      return "desativado";
    case "circuit_open":
      return "pausado";
    default:
      return status;
  }
}

function PriceSparkline({ points }: { points: Array<{ week: string; median: number }> }) {
  if (points.length < 2) return null;
  const values=points.map((p)=>p.median);const min=Math.min(...values);const max=Math.max(...values);const range=max-min||1;
  const coords=values.map((value,index)=>`${(index/(values.length-1))*240},${56-((value-min)/range)*48}`).join(" ");
  return <div className="price-trend"><div><strong>Tendência de preço</strong><span>Mediana semanal · últimos 90 dias</span></div><svg viewBox="0 0 240 64" role="img" aria-label="Evolução da mediana semanal"><polyline points={coords} /></svg></div>;
}

export function ResultsClient({ queryPayload, inlineAds = [] }: Props) {
  const [data, setData] = useState<AggregatedSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("value");
  const [maxPrice, setMaxPrice] = useState("");
  const [stops, setStops] = useState("");
  const [provider, setProvider] = useState("");
  const [priceType, setPriceType] = useState<"all" | "cash" | "points">("all");
  const [airline, setAirline] = useState("");
  const [baggageOnly, setBaggageOnly] = useState(false);

  const runSearch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload),
        signal,
      });
      const json = (await res.json()) as AggregatedSearchResult & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Falha na busca");
      }
      setData(json);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro na busca");
    } finally {
      setLoading(false);
    }
  }, [queryPayload]);

  useEffect(() => {
    const controller = new AbortController();
    void runSearch(controller.signal);
    return () => controller.abort();
  }, [runSearch, retryToken]);

  const filtered = useMemo(() => {
    if (!data) return [] as NormalizedFlightOffer[];
    let list = [...data.offers];
    if (maxPrice) {
      const cap = Number(maxPrice);
      list = list.filter(
        (o) => o.priceType !== "cash" || (o.totalAmount ?? Infinity) <= cap,
      );
    }
    if (stops !== "") {
      const s = Number(stops);
      list = list.filter((o) => o.totalStops <= s);
    }
    if (provider) list = list.filter((o) => o.provider.includes(provider));
    if (priceType !== "all") list = list.filter((o) => o.priceType === priceType);
    if (airline) {
      const q = airline.toLowerCase();
      list = list.filter(
        (o) =>
          o.airlineName.toLowerCase().includes(q) ||
          (o.airlineCode ?? "").toLowerCase().includes(q),
      );
    }
    if (baggageOnly) {
      list = list.filter((o) => Boolean(o.baggage?.checked || o.baggage?.carryOn));
    }
    return rankOffers(list, sort);
  }, [data, maxPrice, stops, provider, priceType, airline, baggageOnly, sort]);

  if (loading) {
    return <ResultsSkeleton />;
  }

  if (error) {
    return (
      <div className="glass results-feedback">
        <h2 className="results-error-title">
          Não foi possível concluir a busca
        </h2>
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setRetryToken((n) => n + 1)}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  const expiredCount = data.offers.filter(
    (o) => o.expiresAt && Date.parse(o.expiresAt) < Date.now(),
  ).length;

  const failedProviders = data.providerStatuses.filter(
    (p) =>
      p.status === "error" ||
      p.status === "circuit_open" ||
      p.error?.code === "TIMEOUT",
  );
  const successProviders = data.providerStatuses.filter(
    (p) => p.status === "success" || p.status === "partial",
  );
  const partialSources =
    failedProviders.length > 0 &&
    successProviders.length > 0 &&
    data.offers.length > 0;
  const allFailed =
    data.offers.length === 0 &&
    data.providerStatuses.every(
      (p) =>
        p.status === "error" ||
        p.status === "disabled" ||
        p.status === "circuit_open",
    );

  return (
    <div className="results-layout">
      {partialSources ? (
        <div className="glass results-banner warn" role="status">
          Algumas fontes não responderam a tempo. Exibindo resultados parciais
          ({successProviders.length} de {data.providerStatuses.length} fontes).
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRetryToken((n) => n + 1)}
          >
            Buscar de novo
          </button>
        </div>
      ) : null}

      <section className="glass results-panel">
        <div className="results-panel-header">
          <h2>
            {filtered.length} oferta(s) · {data.cached ? "cache" : "ao vivo"}
          </h2>
          <button
            type="button"
            className="btn btn-secondary results-filters-toggle"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? "Ocultar filtros" : "Filtros"}
          </button>
        </div>

        <div className="results-highlights">
          <span className="chip">Mais barato marcado nos cards</span>
          <span className="chip">Mais rápido marcado nos cards</span>
          <span className="chip">
            Melhor custo-benefício: preço + duração + escalas + bagagem +
            self-transfer
          </span>
        </div>
        {data.priceIntel?.weekly?.length ? <PriceSparkline points={data.priceIntel.weekly} /> : null}

        {(() => {
          const q = queryPayload as {
            slices?: Array<{ origin?: string; destination?: string }>;
          };
          const origin = q.slices?.[0]?.origin;
          const destination = q.slices?.[0]?.destination;
          if (!origin || !destination) return null;
          return (
            <div className="results-calendar-wrap">
              <h2 className="results-calendar-title">Calendário de preços</h2>
              <PriceCalendar origin={origin} destination={destination} />
            </div>
          );
        })()}

        {data.highlights.bestValueReasons?.length ? (
          <div className="results-value-why" role="note">
            <strong>Por que é o melhor custo-benefício:</strong>
            <ul>
              {data.highlights.bestValueReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="provider-status-list">
          {data.providerStatuses.map((p) => (
            <div
              key={p.provider}
              className={`provider-status provider-status--${p.status}`}
            >
              <strong>{p.provider}</strong>: {providerStatusLabel(p.status)}
              {p.durationMs ? ` (${p.durationMs}ms)` : ""}
              {p.error
                ? ` — ${p.error.message}`
                : ` — ${p.offers.length} ofertas`}
              {p.error?.retryable ? (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setRetryToken((n) => n + 1)}
                >
                  Tentar novamente
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {data.separateLegsComparison ? (
          <p className="results-banner warn results-comparison">
            Ida/volta menor: {data.separateLegsComparison.roundTripLowest ?? "—"} ·
            Trechos separados menor:{" "}
            {data.separateLegsComparison.separateLowest ?? "—"}
            <br />
            {data.separateLegsComparison.note}
          </p>
        ) : null}

        {expiredCount > 0 ? (
          <p className="text-warn">
            {expiredCount} oferta(s) expirada(s) não podem ser compradas.
          </p>
        ) : null}

      </section>

      <div className="results-content-grid">
        <aside className="results-sidebar" aria-label="Filtros da busca">
          <div
          className={`results-filters ${filtersOpen ? "is-open" : ""}`}
        >
          <strong className="results-filters-title">Filtrar resultados</strong>
          <div className="field">
            <label htmlFor="sort">Ordenar</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
            >
              <option value="value">Melhor custo-benefício</option>
              <option value="price">Menor preço</option>
              <option value="duration">Menor duração</option>
              <option value="stops">Menos escalas</option>
              <option value="departure">Horário de saída</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="maxPrice">Preço máx.</label>
            <input
              id="maxPrice"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="ex: 1200"
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label htmlFor="stops">Escalas</label>
            <select id="stops" value={stops} onChange={(e) => setStops(e.target.value)}>
              <option value="">Todas</option>
              <option value="0">Direto</option>
              <option value="1">Até 1</option>
              <option value="2">Até 2</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="duffel">Duffel</option>
              <option value="ignav">Ignav</option>
              <option value="kiwi">Kiwi.com</option>
              <option value="skiplagged">Skiplagged</option>
              <option value="seats-aero">Seats.aero</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="priceType">Tipo</label>
            <select
              id="priceType"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as "all" | "cash" | "points")}
            >
              <option value="all">Dinheiro e milhas</option>
              <option value="cash">Somente dinheiro</option>
              <option value="points">Somente milhas</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="airline">Companhia</label>
            <input
              id="airline"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="LATAM, G3…"
            />
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={baggageOnly}
              onChange={(e) => setBaggageOnly(e.target.checked)}
            />
            Com bagagem informada
          </label>
          </div>
        </aside>

      <section className="results-list">
        {allFailed ? (
          <div className="glass results-feedback">
            <h3>
              Nenhuma fonte disponível
            </h3>
            <p>
              Todos os fornecedores falharam, estão desativados ou pausados. Verifique as
              chaves de API no servidor ou tente novamente em instantes.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setRetryToken((n) => n + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass results-feedback">
            <h3>
              Nenhuma oferta encontrada
            </h3>
            <p>
              {data.offers.length === 0
                ? "Não há ofertas para estes critérios no momento."
                : "Nenhuma oferta combina com os filtros atuais. Ajuste preço, escalas ou companhia."}
            </p>
            {data.offers.length > 0 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMaxPrice("");
                  setStops("");
                  setProvider("");
                  setPriceType("all");
                  setAirline("");
                  setBaggageOnly(false);
                }}
              >
                Limpar filtros
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setRetryToken((n) => n + 1)}
              >
                Tentar novamente
              </button>
            )}
          </div>
        ) : (
          filtered.map((offer, index) => (
            <div key={offer.id} className="results-offer-group">
              <OfferCard
                offer={offer}
                badge={
                  offer.id === data.highlights.cheapestId
                    ? "Mais barato"
                    : offer.id === data.highlights.fastestId
                      ? "Mais rápido"
                      : offer.id === data.highlights.bestValueId
                        ? "Melhor custo-benefício"
                        : undefined
                }
                valueReasons={
                  offer.id === data.highlights.bestValueId
                    ? data.highlights.bestValueReasons
                    : undefined
                }
                priceClassification={data.priceIntel?.classifications[offer.id]}
                priceSampleCount={data.priceIntel?.sampleCount}
                mileageBonus={offer.pointsProgram ? data.mileageBonuses?.[offer.pointsProgram] : undefined}
              />
              {inlineAds.length > 0 && index === 2
                ? inlineAds.map((slot) => <AdSlotCard key={slot.id} slot={slot} />)
                : null}
            </div>
          ))
        )}
      </section>
      </div>
    </div>
  );
}
