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
};

export function OfferCard({ offer, badge, valueReasons }: Props) {
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
      className="glass animate-rise offer-card"
      data-testid="offer-card"
      style={{
        borderRadius: "1.25rem",
        padding: "1.1rem 1.2rem",
        opacity: expired ? 0.55 : 1,
        display: "grid",
        gap: "0.75rem",
      }}
    >
      <div className="offer-card-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          {badge ? <span className="offer-badge">{badge}</span> : null}
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
            {offer.airlineName}
            {offer.airlineCode &&
            offer.operatingCarriers.some((c) => c !== offer.airlineCode) ? (
              <span style={{ fontSize: "0.9rem", fontWeight: 500, opacity: 0.7 }}>
                {" "}
                · operado por {offer.operatingCarriers.join(", ")}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: "0.9rem", opacity: 0.75 }}>
            Fonte: {offer.provider}
            {offer.separateTickets ? " · bilhetes separados / self-transfer" : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--accent-dark)" }}>
            {offer.priceType === "points"
              ? formatPrice(offer.taxesAmount, offer.taxesCurrency, offer.pointsAmount, offer.pointsProgram)
              : formatPrice(offer.totalAmount, offer.currency)}
          </div>
          {offer.promotionLabel ? (
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ok)" }}>
              {offer.promotionLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        {offer.slices.map((slice, idx) => (
          <div
            key={`${offer.id}-slice-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "0.75rem",
              alignItems: "center",
              background: "rgba(16,32,51,0.04)",
              borderRadius: "0.9rem",
              padding: "0.75rem",
            }}
          >
            <div>
              <strong>{formatTime(slice.departureAt)}</strong>
              <div>{slice.origin}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: "0.85rem" }}>
              <div>{formatDuration(slice.durationMinutes)}</div>
              <div style={{ opacity: 0.7 }}>
                {stopsLabel(slice.stops, slice.stopAirports)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong>{formatTime(slice.arrivalAt)}</strong>
              <div>{slice.destination}</div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem 1.25rem",
          fontSize: "0.88rem",
          opacity: 0.85,
        }}
      >
        <span>Duração total: {formatDuration(offer.totalDurationMinutes)}</span>
        <span>{stopsLabel(offer.totalStops, stopAirports)}</span>
        <span>Cabine: {offer.cabin}</span>
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
          <span style={{ color: "var(--warn)", fontWeight: 700 }}>
            Possivelmente desatualizado — confirme no site da companhia antes de transferir pontos
          </span>
        ) : null}
        {offer.estimatedCpp != null ? (
          <span>~{offer.estimatedCpp.toFixed(1)} cpp (piso de avaliação)</span>
        ) : null}
      </div>

      {offer.separateTickets ? (
          <div style={{ fontSize: "0.85rem", color: "var(--warn)", fontWeight: 700 }}>
            Atenção: pode envolver bilhetes separados ou hidden-city. Confirme bagagem,
            conexão e regras no site do fornecedor antes de comprar.
          </div>
        ) : null}

      {offer.promotionMeta && offer.promotionMeta.sampleCount >= 5 ? (
        <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
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

      <div className="offer-card-actions">
        {expired ? (
          <button className="btn btn-secondary" disabled>
            Oferta expirada
          </button>
        ) : bookingHref ? (
          <a
            className="btn btn-primary"
            href={bookingHref}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-testid="offer-booking-link"
          >
            Continuar no fornecedor
          </a>
        ) : (
          <span style={{ fontSize: "0.9rem", opacity: 0.75 }}>
            Sem link direto — use a fonte {offer.provider} com estes horários.
            {first ? ` ${first.origin}→${first.destination}` : ""}
          </span>
        )}
      </div>
    </article>
  );
}
