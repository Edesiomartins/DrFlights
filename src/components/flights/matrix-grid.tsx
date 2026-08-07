"use client";

import { useMemo, useState } from "react";
import type { NormalizedFlightOffer } from "@/lib/flights/types";

type Props = {
  offers: NormalizedFlightOffer[];
  baseDepartDate?: string;
  baseReturnDate?: string;
  onSelectDates?: (depart: string, ret?: string) => void;
};

export function MatrixGrid({
  offers,
  baseDepartDate,
  baseReturnDate,
  onSelectDates,
}: Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const gridData = useMemo(() => {
    if (!offers.length || !baseDepartDate) return null;

    // Extrai datas dos voos
    const cells = new Map<string, { price: number; currency: string; count: number }>();
    
    for (const offer of offers) {
      if (offer.priceType !== "cash" || offer.totalAmount == null) continue;
      const depart = offer.slices[0]?.departureAt?.slice(0, 10);
      const ret = offer.slices[1]?.departureAt?.slice(0, 10) ?? "ONE_WAY";
      if (!depart) continue;

      const key = `${depart}|${ret}`;
      const existing = cells.get(key);
      if (!existing || offer.totalAmount < existing.price) {
        cells.set(key, {
          price: offer.totalAmount,
          currency: offer.currency ?? "BRL",
          count: (existing?.count ?? 0) + 1,
        });
      }
    }

    if (cells.size === 0) return null;

    const allPrices = [...cells.values()].map((c) => c.price);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    return { cells, minPrice, maxPrice };
  }, [offers, baseDepartDate]);

  if (!gridData) return null;

  return (
    <div className="glass matrix-grid-card">
      <div className="matrix-grid-header">
        <div>
          <h3>Flexibilidade de Datas & Mapa de Tarifas</h3>
          <p>Selecione uma combinação de datas para ver as melhores ofertas encontradas.</p>
        </div>
        <div className="matrix-legend">
          <span className="legend-item legend-cheapest">Menor preço</span>
          <span className="legend-item legend-typical">Preço típico</span>
          <span className="legend-item legend-highest">Acima da média</span>
        </div>
      </div>
      <div className="matrix-grid-summary">
        <strong>Preço mínimo encontrado:</strong> R$ {gridData.minPrice.toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
