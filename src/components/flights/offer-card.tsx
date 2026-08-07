"use client";

import type { NormalizedFlightOffer } from "@/lib/flights/types";
import {
  formatDuration,
  formatPrice,
  formatTime,
  stopsLabel,
} from "@/components/flights/format";
import { buildGoUrl } from "@/lib/ads/config";

type Props = {
  offer: NormalizedFlightOffer;
  badge?: string;
  valueReasons?: string[];
  priceClassification?: "BAIXO" | "TIPICO" | "ALTO";
  priceSampleCount?: number;
  mileageBonus?: number;
};

export function OfferCard({
  offer,
  badge,
  valueReasons,
  priceClassification,
  priceSampleCount,
  mileageBonus,
}: Props) {
  const expired =
    offer.expiresAt != null && Date.parse(offer.expiresAt) < Date.now();
  const first = offer.slices[0];
  const stopAirports = offer.slices.flatMap((s) => s.stopAirports);
  const bookingHref = offer.bookingUrl
    ? buildGoUrl({
        to: offer.bookingUrl,
        placement: "results_card",
        partner: offer.provider,
      })
    : undefined;

  return (
    <article
      className={`glass animate-rise offer-card ${expired ? "is-expired" : ""}`}
      data-testid="offer-card"
    >
      {expired ? <span className="offer-expired-tag">Oferta expirada</span> : null}
      <div className="offer-badges">
        {badge ? <span className="offer-badge">{badge}</span> : null}
        {offer.separateTickets ? <span className="offer-badge offer-badge-warn">Self-transfer</span> : null}
        {priceClassification ? (
          <span
            className={`offer-badge price-badge price-badge--${priceClassification.toLowerCase()}`}
            data-testid="price-seal"
            title={
              priceSampleCount
                ? `Classificação pelos percentis (p25/p75) de ${priceSampleCount} preços observados nos últimos 90 dias nesta rota. Sem amostra suficiente o selo não aparece.`
                : "Classificação baseada em percentis históricos da rota (últimos 90 dias)."
            }
          >
            {priceClassification === "BAIXO"
              ? "Preço abaixo do normal para esta rota"
              : priceClassification === "ALTO"
                ? "Preço alto"
                : "Preço típico"}
            {priceSampleCount ? (
              <em className="price-seal-hint"> · {priceSampleCount} amostras</em>
            ) : null}
          </span>
        ) : null}
        {mileageBonus ? <span className="offer-badge mileage-bonus-badge">Programa com transferência bonificada de até {mileageBonus}%</span> : null}
      </div>
      <div className="offer-main-grid">
        <div className="offer-itinerary-zone">
          <div className="offer-airline">
            <span className="offer-airline-mark" aria-hidden>{offer.airlineCode?.slice(0, 2) ?? "✈"}</span>
            <div>
              <strong>{offer.airlineName}</strong>
              <span>Fonte: {offer.provider}</span>
              {offer.airlineCode && offer.operatingCarriers.some((c) => c !== offer.airlineCode) ? (
                <small>Operado por {offer.operatingCarriers.join(", ")}</small>
              ) : null}
            </div>
          </div>
          <div className="offer-slices">
            {offer.slices.map((slice, idx) => (
              <div key={`${offer.id}-slice-${idx}`} className="offer-slice">
                <div className="offer-endpoint"><strong>{formatTime(slice.departureAt)}</strong><span>{slice.origin}</span></div>
                <div className="offer-timeline">
                  <span>{formatDuration(slice.durationMinutes)}</span>
                  <div><i /><b /><i /></div>
                  <small>{stopsLabel(slice.stops, slice.stopAirports)}</small>
                </div>
                <div className="offer-endpoint offer-endpoint-arrival"><strong>{formatTime(slice.arrivalAt)}</strong><span>{slice.destination}</span></div>
              </div>
            ))}
          </div>
        </div>
        <aside className="offer-price-zone">
          <span className="offer-price-label">Preço por viajante</span>
          <strong className="offer-price">
            {offer.priceType === "points" ? formatPrice(offer.taxesAmount, offer.taxesCurrency, offer.pointsAmount, offer.pointsProgram) : formatPrice(offer.totalAmount, offer.currency)}
          </strong>
          {offer.pointsProgram ? <span className="offer-program">{offer.pointsProgram}</span> : null}
          {offer.promotionLabel ? (
            <span className={`offer-promotion ${offer.promotionLabel.includes("BUG FARE") ? "offer-promotion--bugfare" : ""}`}>
              {offer.promotionLabel}
            </span>
          ) : null}

          {offer.mileageArbitrage ? (
            <div className="mileage-arbitrage-box" data-testid="mileage-arbitrage">
              <div className="cpm-badge">
                <span>CPM:</span>
                <strong>R$ {offer.mileageArbitrage.cpm.toFixed(2)}</strong>
                <small>/ 1.000 pts</small>
              </div>
              <div className="cpm-equiv">
                Equiv. monetário: <strong>R$ {offer.mileageArbitrage.cashEquivalent.toLocaleString("pt-BR")}</strong>
              </div>
              <span className={`arbitrage-rec-badge arbitrage-rec--${offer.mileageArbitrage.recommendation.replace(/\s+/g, "").toLowerCase()}`}>
                {offer.mileageArbitrage.recommendation}
                {offer.mileageArbitrage.savingsPercent > 0 ? ` (${offer.mileageArbitrage.savingsPercent}% de economia)` : ""}
              </span>
            </div>
          ) : null}
          <div className="offer-card-actions">
            {expired ? <button className="btn btn-secondary" disabled>Oferta expirada</button> : bookingHref ? (
              <a className="btn offer-cta" href={bookingHref} target="_blank" rel="noopener noreferrer sponsored" data-testid="offer-booking-link">Ver oferta <span aria-hidden>→</span></a>
            ) : <span className="offer-no-link">Sem link direto — consulte {offer.provider}{first ? ` para ${first.origin}→${first.destination}` : ""}.</span>}
          </div>
        </aside>
      </div>
      <div className="offer-meta">
        <span>Duração total: {formatDuration(offer.totalDurationMinutes)}</span>
        <span>{stopsLabel(offer.totalStops, stopAirports)}</span>
        <span>Cabine: {offer.cabin}</span>
        {offer.remainingSeats ? <span className="offer-seats-left">⚠️ Restam apenas {offer.remainingSeats} assentos!</span> : null}
        {offer.baggage?.carryOn ? <span>Mão: {offer.baggage.carryOn}</span> : null}
        {offer.baggage?.checked ? <span>Despacho: {offer.baggage.checked}</span> : null}
        {offer.refundable != null ? (
          <span>{offer.refundable ? "Reembolsável" : "Não reembolsável"}</span>
        ) : null}
        {offer.changeable != null ? (
          <span>{offer.changeable ? "Alterável" : "Não alterável"}</span>
        ) : null}
        <span>
          Consultado:{" "}
          {new Date(offer.observedAt).toLocaleString("pt-BR")}
        </span>
        {offer.expiresAt ? (
          <span>
            Expira: {new Date(offer.expiresAt).toLocaleString("pt-BR")}
          </span>
        ) : null}
        {offer.stale ? (
          <span className="offer-stale">
            Possivelmente desatualizado — confirme no site da companhia antes de transferir pontos
          </span>
        ) : null}
        {offer.estimatedCpp != null ? (
          <span>~{offer.estimatedCpp.toFixed(1)} cpp (piso de avaliação)</span>
        ) : null}
      </div>

      {offer.separateTickets ? (
          <div className="offer-warning">
            Atenção: pode envolver bilhetes separados ou hidden-city. Confirme bagagem,
            conexão e regras no site do fornecedor antes de comprar.
          </div>
        ) : null}

      {offer.promotionMeta && offer.promotionMeta.sampleCount >= 5 ? (
        <div className="offer-history">
          Mediana histórica ({offer.promotionMeta.periodDays}d, {offer.promotionMeta.sampleCount} amostras):{" "}
          {offer.promotionMeta.medianPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          {" · "}
          diferença {offer.promotionMeta.percentDiff.toFixed(1)}%
        </div>
      ) : null}

      {valueReasons && valueReasons.length > 0 ? (
        <div className="offer-value-reasons" data-testid="value-reasons">
          <strong>Por que custo-benefício:</strong>
          <ul>
            {valueReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

    </article>
  );
}
