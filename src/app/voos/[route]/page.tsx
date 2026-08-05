import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getRoutePriceStats } from "@/lib/price-intel/stats";
import { getAppName, getAppUrl } from "@/lib/utils/env";
import { PriceCalendar } from "@/components/flights/price-calendar";

type Props = { params: Promise<{ route: string }> };

function parseRoute(slug: string): { origin: string; destination: string } | null {
  const match = slug.toLowerCase().match(/^([a-z]{3})-([a-z]{3})$/);
  if (!match?.[1] || !match[2]) return null;
  return {
    origin: match[1].toUpperCase(),
    destination: match[2].toUpperCase(),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route } = await params;
  const parsed = parseRoute(route);
  if (!parsed) return { title: "Rota não encontrada" };
  const title = `Voos ${parsed.origin} → ${parsed.destination} | ${getAppName()}`;
  const description = `Compare preços reais de passagens ${parsed.origin}–${parsed.destination}. Dados de APIs e histórico observados — sem preços inventados.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `${getAppUrl()}/voos/${route}` },
    alternates: { canonical: `${getAppUrl()}/voos/${route}` },
  };
}

export default async function RouteSeoPage({ params }: Props) {
  const { route } = await params;
  const parsed = parseRoute(route);
  if (!parsed) notFound();

  const { origin, destination } = parsed;
  const [stats, latestSnapshot, recentDeal] = await Promise.all([
    getRoutePriceStats(origin, destination),
    prisma.priceSnapshot.findFirst({
      where: {
        origin,
        destination,
        amount: { not: null },
      },
      orderBy: { observedAt: "desc" },
    }),
    prisma.deal.findFirst({
      where: {
        origin,
        destination,
        status: { in: ["NEW", "VERIFIED"] },
        price: { not: null },
        publishedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      orderBy: { price: "asc" },
    }),
  ]);

  const hasPrice =
    (stats.enough && stats.median != null) ||
    latestSnapshot?.amount != null ||
    recentDeal?.price != null;

  const searchHref = `/?origin=${origin}&destination=${destination}`;
  const alertHref = `/alertas`;

  return (
    <div className="shell page-shell">
      <header className="page-header-block">
        <p className="section-kicker">Rota</p>
        <h1 className="page-title">
          Voos {origin} → {destination}
        </h1>
        <p className="page-lead">
          Preços exibidos apenas a partir de histórico real (PriceSnapshot),
          promoções ingeridas e calendário Travelpayouts quando configurado.
        </p>
      </header>

      <section className="glass content-card">
        {!hasPrice ? (
          <div data-testid="route-empty-price">
            <p>
              Ainda não há preço observado para {origin} → {destination}.
            </p>
            <p className="text-muted">
              Faça uma busca ou crie um alerta — não inventamos valores.
            </p>
            <div className="route-cta-row">
              <Link className="btn btn-primary" href={searchHref}>
                Buscar esta rota
              </Link>
              <Link className="btn btn-secondary" href={alertHref}>
                Criar alerta
              </Link>
            </div>
          </div>
        ) : (
          <div data-testid="route-real-price">
            {latestSnapshot?.amount != null ? (
              <p>
                Último preço observado:{" "}
                <strong>
                  {latestSnapshot.currency}{" "}
                  {latestSnapshot.amount.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </strong>{" "}
                em{" "}
                {latestSnapshot.observedAt.toLocaleString("pt-BR")}
              </p>
            ) : null}
            {stats.enough && stats.median != null ? (
              <p>
                Mediana 90d ({stats.sampleCount} amostras): R${" "}
                {stats.median.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            ) : stats.sampleCount > 0 ? (
              <p className="text-muted">
                Histórico insuficiente para classificação ({stats.sampleCount}{" "}
                amostras).
              </p>
            ) : null}
            {recentDeal?.price != null ? (
              <p>
                Melhor promoção recente: R${" "}
                {recentDeal.price.toLocaleString("pt-BR")} — {recentDeal.title}
              </p>
            ) : null}
            <div className="route-cta-row">
              <Link
                className="btn btn-primary"
                href={`/resultados?q=${encodeURIComponent(
                  JSON.stringify({
                    tripType: "one_way",
                    slices: [
                      {
                        origin,
                        destination,
                        departureDate: new Date(Date.now() + 21 * 86400000)
                          .toISOString()
                          .slice(0, 10),
                      },
                    ],
                    adults: 1,
                    children: 0,
                    infants: 0,
                    cabin: "economy",
                  }),
                )}`}
              >
                Ver ofertas agora
              </Link>
              <Link className="btn btn-secondary" href={alertHref}>
                Criar alerta
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="route-calendar-section">
        <h2>Calendário de preços</h2>
        <PriceCalendar origin={origin} destination={destination} />
      </section>
    </div>
  );
}
