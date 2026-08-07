"use client";

import { useTopDeals } from "@/hooks/use-top-deals";
import {
  dispatchPrefillSearch,
  formatDealPrice,
  formatDiscountBadge,
} from "@/lib/deals/format";

export function HomeDealChips() {
  const { items, loading } = useTopDeals(4);

  if (loading || !items?.length) return null;

  // Prefer real deals with discount; skip pure fallback for chips (hero “melhores achados”)
  const chips = items
    .filter((d) => !d.isFallback && d.discountScore != null && d.discountScore >= 1)
    .slice(0, 4);

  if (chips.length === 0) return null;

  return (
    <div
      className="home-deal-chips"
      data-testid="home-deal-chips"
      aria-label="Melhores achados hoje"
    >
      <p className="home-deal-chips-label">Melhores achados hoje</p>
      <div className="home-deal-chips-row" role="list">
        {chips.map((deal) => {
          const badge = formatDiscountBadge(deal.discountScore);
          return (
            <div key={deal.id} className="home-deal-chip" role="listitem">
              <button
                type="button"
                className="home-deal-chip-main"
                onClick={() =>
                  dispatchPrefillSearch({
                    origin: deal.origin,
                    destination: deal.destination,
                    runSearch: false,
                  })
                }
              >
                <span className="home-deal-chip-route">
                  {deal.origin} → {deal.destination}
                </span>
                <span className="home-deal-chip-price">
                  {formatDealPrice(deal.price, deal.currency)}
                </span>
                {badge ? (
                  <span className="home-deal-chip-badge">{badge}</span>
                ) : null}
              </button>
              {deal.href ? (
                <a
                  className="home-deal-chip-offer"
                  href={deal.href}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  Ver oferta
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
