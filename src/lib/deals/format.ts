import type { TopDealItem, TopDealsResult } from "@/lib/deals/top";

export type { TopDealItem, TopDealsResult };

export const PREFILL_SEARCH_EVENT = "drflights:prefill-search";

export type PrefillSearchDetail = {
  origin: string;
  destination: string;
  /** When true, navigate to results with a factual mid-horizon date. */
  runSearch?: boolean;
};

export function dispatchPrefillSearch(detail: PrefillSearchDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PrefillSearchDetail>(PREFILL_SEARCH_EVENT, { detail }),
  );
}

export function formatDealPrice(price: number, currency = "BRL"): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDiscountBadge(
  discountScore: number | null | undefined,
): string | null {
  if (discountScore == null || !Number.isFinite(discountScore) || discountScore < 1) {
    return null;
  }
  return `−${Math.round(discountScore)}%`;
}

export function futureDepartDate(daysAhead = 21): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}
