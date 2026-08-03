"use client";

import { useEffect, useMemo, useState } from "react";
import { AdSlotCard } from "@/components/ads/ad-slot-card";
import { OfferCard } from "@/components/flights/offer-card";
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

export function ResultsClient({ queryPayload, inlineAds = [] }: Props) {
  const [data, setData] = useState<AggregatedSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("value");
  const [maxPrice, setMaxPrice] = useState("");
  const [stops, setStops] = useState("");
  const [provider, setProvider] = useState("");
  const [priceType, setPriceType] = useState<"all" | "cash" | "points">("all");
  const [airline, setAirline] = useState("");
  const [baggageOnly, setBaggageOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/flights/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queryPayload),
        });
        const json = (await res.json()) as AggregatedSearchResult & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Falha na busca");
        }
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro na busca");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [queryPayload]);

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
    return (
      <div className="glass" style={{ borderRadius: "1.25rem", padding: "2rem", color: "var(--ink)" }}>
        Consultando fornecedores em paralelo…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass" style={{ borderRadius: "1.25rem", padding: "2rem", color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const expiredCount = data.offers.filter(
    (o) => o.expiresAt && Date.parse(o.expiresAt) < Date.now(),
  ).length;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="glass" style={{ borderRadius: "1.25rem", padding: "1.25rem" }}>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
          {filtered.length} oferta(s) · {data.cached ? "cache" : "ao vivo"}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
          <span className="btn btn-secondary" style={{ cursor: "default" }}>
            Mais barato: {data.highlights.cheapestId ? "marcado nos cards" : "—"}
          </span>
          <span className="btn btn-secondary" style={{ cursor: "default" }}>
            Mais rápido: {data.highlights.fastestId ? "marcado nos cards" : "—"}
          </span>
          <span className="btn btn-secondary" style={{ cursor: "default" }}>
            Melhor custo-benefício: preço + duração + escalas + bagagem + flexibilidade
          </span>
        </div>

        <div style={{ display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>
          {data.providerStatuses.map((p) => (
            <div key={p.provider} style={{ fontSize: "0.9rem" }}>
              <strong>{p.provider}</strong>: {p.status}
              {p.durationMs ? ` (${p.durationMs}ms)` : ""}
              {p.error ? ` — ${p.error.message}` : ` — ${p.offers.length} ofertas`}
            </div>
          ))}
        </div>

        {data.separateLegsComparison ? (
          <p style={{ background: "rgba(201,133,26,0.12)", padding: "0.75rem 1rem", borderRadius: "0.75rem" }}>
            Ida/volta menor: {data.separateLegsComparison.roundTripLowest ?? "—"} ·
            Trechos separados menor: {data.separateLegsComparison.separateLowest ?? "—"}
            <br />
            {data.separateLegsComparison.note}
          </p>
        ) : null}

        {expiredCount > 0 ? (
          <p style={{ color: "var(--warn)" }}>{expiredCount} oferta(s) expirada(s) não podem ser compradas.</p>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div className="field">
            <label>Ordenar</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
              <option value="value">Melhor custo-benefício</option>
              <option value="price">Menor preço</option>
              <option value="duration">Menor duração</option>
              <option value="stops">Menos escalas</option>
              <option value="departure">Horário de saída</option>
            </select>
          </div>
          <div className="field">
            <label>Preço máx.</label>
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="ex: 1200" />
          </div>
          <div className="field">
            <label>Escalas</label>
            <select value={stops} onChange={(e) => setStops(e.target.value)}>
              <option value="">Todas</option>
              <option value="0">Direto</option>
              <option value="1">Até 1</option>
              <option value="2">Até 2</option>
            </select>
          </div>
          <div className="field">
            <label>Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">Todos</option>
              <option value="duffel">Duffel</option>
              <option value="ignav">Ignav</option>
              <option value="kiwi">Kiwi.com</option>
              <option value="skiplagged">Skiplagged</option>
              <option value="seats-aero">Seats.aero</option>
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as "all" | "cash" | "points")}
            >
              <option value="all">Dinheiro e milhas</option>
              <option value="cash">Somente dinheiro</option>
              <option value="points">Somente milhas</option>
            </select>
          </div>
          <div className="field">
            <label>Companhia</label>
            <input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="LATAM, G3…" />
          </div>
          <label style={{ display: "flex", alignItems: "end", gap: "0.5rem", paddingBottom: "0.6rem" }}>
            <input
              type="checkbox"
              checked={baggageOnly}
              onChange={(e) => setBaggageOnly(e.target.checked)}
            />
            Com bagagem informada
          </label>
        </div>
      </section>

      <section style={{ display: "grid", gap: "1rem" }}>
        {filtered.length === 0 ? (
          <div className="glass" style={{ borderRadius: "1.25rem", padding: "1.5rem" }}>
            Nenhuma oferta com os filtros atuais. Se todos os providers estiverem desativados,
            configure as chaves de API no servidor.
          </div>
        ) : (
          filtered.map((offer, index) => (
            <div key={offer.id} style={{ display: "grid", gap: "1rem" }}>
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
              />
              {inlineAds.length > 0 && index === 2
                ? inlineAds.map((slot) => <AdSlotCard key={slot.id} slot={slot} />)
                : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
