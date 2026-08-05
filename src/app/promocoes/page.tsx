import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { buildGoUrl } from "@/lib/ads/config";
import { MileageSubscribeButton } from "@/components/mileage/mileage-subscribe-button";

export default async function PromocoesPage() {
  const now = new Date();
  const session = await auth();
  const [deals, mileage, subscription] = await Promise.all([
    prisma.deal.findMany({ where: { status: { in: ["NEW", "VERIFIED"] }, publishedAt: { gte: new Date(Date.now() - 30 * 86400000) } }, include: { source: true }, orderBy: [{ discountScore: "desc" }, { publishedAt: "desc" }], take: 50 }),
    prisma.mileageTransferPromo.findMany({ where: { status: "ACTIVE", validUntil: { gt: now } }, orderBy: { bonusPercent: "desc" }, take: 20 }),
    session?.user?.id ? prisma.mileagePromoSubscription.findUnique({ where: { userId: session.user.id } }) : null,
  ]);

  return <div className="shell page-shell">
    <div className="section-heading">
      <span className="section-kicker">Radar DrFlights</span>
      <h1 className="page-title">Promoções e oportunidades</h1>
      <p>Ofertas de fontes públicas e transferências bonificadas verificadas.</p>
      <MileageSubscribeButton initialActive={subscription?.active ?? false} />
    </div>
    {mileage.length > 0 ? <section className="glass content-card"><h2>Transferência bonificada ativa</h2><div className="deal-grid">{mileage.map((promo) => <article className="deal-card" key={promo.id}><span className="offer-badge">Até {promo.bonusPercent}% de bônus</span><h3>{promo.sourceProgram} → {promo.destinationProgram}</h3><p>Válida até {promo.validUntil.toLocaleDateString("pt-BR")}</p><a className="btn offer-cta" href={buildGoUrl({ to: promo.officialUrl, placement: "mileage_promo", partner: promo.destinationProgram })} target="_blank" rel="sponsored noopener">Ver promoção →</a></article>)}</div></section> : null}
    <section><div className="deal-grid">{deals.map((deal) => <article className="glass deal-card" key={deal.id}>{deal.discountScore ? <span className="offer-badge">{Math.round(deal.discountScore)}% abaixo da mediana</span> : <span className="offer-badge">Nova oferta</span>}<h2>{deal.title}</h2>{deal.origin && deal.destination ? <strong>{deal.origin} → {deal.destination}</strong> : null}{deal.price ? <p className="deal-price">R$ {deal.price.toLocaleString("pt-BR")}</p> : null}<small>Fonte: {deal.source.name} · {deal.publishedAt.toLocaleDateString("pt-BR")}</small><a className="btn offer-cta" href={buildGoUrl({ to: deal.originalUrl, placement: "deals", partner: deal.source.name })} target="_blank" rel="sponsored noopener">Ver oferta →</a></article>)}{deals.length === 0 ? <div className="glass empty-card">Nenhuma promoção recente encontrada. Volte em breve.</div> : null}</div></section>
    <Link href="/" className="btn btn-secondary state-primary">Buscar voos</Link>
  </div>;
}
