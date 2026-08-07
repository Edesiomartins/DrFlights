"use client";

import Link from "next/link";
import { useTopDeals } from "@/hooks/use-top-deals";
import {
  formatDealPrice,
  formatDiscountBadge,
} from "@/lib/deals/format";
import { ScrollBasedVelocity } from "@/components/ui/scroll-based-velocity";

type Props = {
  appName: string;
};

export function SiteMarquee({ appName }: Props) {
  const { items, loading } = useTopDeals(8);

  if (loading) {
    return (
      <div
        className="site-marquee site-marquee--loading"
        role="status"
        aria-live="polite"
      >
        <span className="site-marquee-skeleton">
          Carregando promoções…
        </span>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const nodes = items.map((deal) => {
    const price = formatDealPrice(deal.price, deal.currency);
    const badge = formatDiscountBadge(deal.discountScore);
    const label = `${deal.origin} → ${deal.destination} ${price}${
      badge ? ` (${badge})` : ""
    }${deal.isFallback ? " · histórico" : ""}`;
    const href = deal.href ?? `/voos/${deal.origin.toLowerCase()}-${deal.destination.toLowerCase()}`;

    return (
      <Link
        key={deal.id}
        href={href}
        className="site-marquee-link"
        prefetch={false}
        {...(href.startsWith("/api/go")
          ? { target: "_blank", rel: "noopener noreferrer sponsored" }
          : {})}
        aria-label={`Promoção ${label} — ${appName}`}
      >
        <span className="site-marquee-route">
          {deal.origin} → {deal.destination}
        </span>
        <span className="site-marquee-price">{price}</span>
        {badge ? <span className="site-marquee-badge">{badge}</span> : null}
      </Link>
    );
  });

  return (
    <div className="site-marquee" role="region" aria-label="Promoções em destaque">
      <ul className="sr-only">
        {items.map((deal) => (
          <li key={`list-${deal.id}`}>
            {deal.origin} → {deal.destination}:{" "}
            {formatDealPrice(deal.price, deal.currency)}
          </li>
        ))}
      </ul>
      <ScrollBasedVelocity
        items={nodes}
        default_velocity={0.55}
        className="site-marquee-text"
      />
    </div>
  );
}
