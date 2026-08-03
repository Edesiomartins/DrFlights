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
    <aside className="ad-card glass" aria-label={slot.sponsored ? "Anúncio patrocinado" : "Destaque"}>
      <div className="ad-card-top">
        <strong className="ad-card-title">{slot.title}</strong>
        {slot.sponsored ? <span className="ad-card-badge">Patrocinado</span> : null}
      </div>

      {slot.description ? <p className="ad-card-desc">{slot.description}</p> : null}

      {slot.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ad-card-image" src={slot.imageUrl} alt="" />
      ) : null}

      {isInternal ? (
        <Link className="btn btn-secondary ad-card-cta" href={href}>
          {slot.ctaLabel ?? "Saiba mais"}
        </Link>
      ) : (
        <a
          className="btn btn-secondary ad-card-cta"
          href={href}
          rel="sponsored noopener noreferrer"
        >
          {slot.ctaLabel ?? "Saiba mais"}
        </a>
      )}
    </aside>
  );
}
