"use client";

import { useMemo } from "react";
import { useTopDeals } from "@/hooks/use-top-deals";
import {
  dispatchPrefillSearch,
  formatDealPrice,
  formatDiscountBadge,
} from "@/lib/deals/format";

/** Compact 5×7 capital letter bitmaps for IATA codes (factual glyphs, not content). */
const GLYPHS: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
};

function DotMatrixCode({ code }: { code: string }) {
  const letters = code.toUpperCase().slice(0, 3).split("");
  return (
    <div className="dot-iata" aria-hidden>
      {letters.map((letter, li) => {
        const rows = GLYPHS[letter] ?? GLYPHS.X!;
        return (
          <div key={`${letter}-${li}`} className="dot-iata-letter">
            {rows.map((row, ri) => (
              <div key={ri} className="dot-iata-row">
                {Array.from({ length: 5 }, (_, ci) => {
                  const on = Boolean(row & (1 << (4 - ci)));
                  return (
                    <i
                      key={ci}
                      className={`dot-iata-cell${on ? " is-on" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function HomeDealStatusCard() {
  const { items, loading } = useTopDeals(1);

  const deal = useMemo(() => {
    if (!items?.length) return null;
    // Only real promo deals for this card — never invent YYZ→HND defaults
    const real = items.find((d) => !d.isFallback);
    return real ?? null;
  }, [items]);

  if (loading || !deal) return null;

  const badge = formatDiscountBadge(deal.discountScore);
  const price = formatDealPrice(deal.price, deal.currency);

  function openSearch() {
    dispatchPrefillSearch({
      origin: deal!.origin,
      destination: deal!.destination,
      runSearch: false,
    });
  }

  return (
    <article
      className="home-deal-card"
      data-testid="home-deal-card"
      aria-label={`Promoção ${deal.origin} para ${deal.destination}`}
    >
      <button
        type="button"
        className="home-deal-card-body"
        onClick={openSearch}
      >
        <header className="home-deal-card-head">
          <span className="home-deal-card-kicker">Melhor achado</span>
          {badge ? <span className="home-deal-card-badge">{badge}</span> : null}
        </header>
        <div className="home-deal-card-codes">
          <div>
            <DotMatrixCode code={deal.origin} />
            <span className="home-deal-card-city">{deal.originCity}</span>
            <strong className="sr-only">{deal.origin}</strong>
          </div>
          <span className="home-deal-card-arrow" aria-hidden>
            →
          </span>
          <div>
            <DotMatrixCode code={deal.destination} />
            <span className="home-deal-card-city">{deal.destinationCity}</span>
            <strong className="sr-only">{deal.destination}</strong>
          </div>
        </div>
        <p className="home-deal-card-price">{price}</p>
        <p className="home-deal-card-hint">Buscar esta rota</p>
      </button>
      {deal.href ? (
        <a
          className="home-deal-card-cta"
          href={deal.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
        >
          Ver oferta na fonte
        </a>
      ) : null}
    </article>
  );
}
