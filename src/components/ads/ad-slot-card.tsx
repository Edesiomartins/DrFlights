import Link from "next/link";
import { buildGoUrl, type AdSlotConfig } from "@/lib/ads/config";

export function AdSlotCard({ slot }: { slot: AdSlotConfig }) {
  const href = buildGoUrl({
    to: slot.targetUrl,
    placement: slot.placement,
    partner: slot.partner,
    slotId: slot.id,
  });

  const isInternal = slot.targetUrl.startsWith("/");

  return (
    <aside
      className="glass"
      aria-label={slot.sponsored ? "Anúncio patrocinado" : "Destaque"}
      style={{
        borderRadius: "1.1rem",
        padding: "1rem 1.1rem",
        border: "1px dashed rgba(16,32,51,0.18)",
        display: "grid",
        gap: "0.65rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
          {slot.title}
        </strong>
        {slot.sponsored ? (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--warn)",
              background: "rgba(201,133,26,0.12)",
              padding: "0.25rem 0.55rem",
              borderRadius: "999px",
            }}
          >
            Patrocinado
          </span>
        ) : null}
      </div>

      {slot.description ? (
        <p style={{ margin: 0, fontSize: "0.92rem", opacity: 0.85 }}>
          {slot.description}
        </p>
      ) : null}

      {slot.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.imageUrl}
          alt=""
          style={{
            width: "100%",
            maxHeight: 160,
            objectFit: "cover",
            borderRadius: "0.75rem",
          }}
        />
      ) : null}

      {isInternal ? (
        <Link className="btn btn-secondary" href={href} style={{ width: "fit-content" }}>
          {slot.ctaLabel ?? "Saiba mais"}
        </Link>
      ) : (
        <a
          className="btn btn-secondary"
          href={href}
          rel="sponsored noopener noreferrer"
        >
          {slot.ctaLabel ?? "Saiba mais"}
        </a>
      )}
    </aside>
  );
}
