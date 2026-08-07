"use client";

import { useEffect, useState } from "react";
import type { TopDealItem, TopDealsResult } from "@/lib/deals/top";

export function useTopDeals(limit: number) {
  const [items, setItems] = useState<TopDealItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/deals/top?limit=${limit}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          if (!cancelled) {
            setItems([]);
            setError("Falha ao carregar promoções.");
          }
          return;
        }
        const json = (await res.json()) as TopDealsResult;
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError("Falha de rede.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { items, loading, error };
}
