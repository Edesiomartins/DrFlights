import { NextResponse } from "next/server";
import { ingestDeals } from "@/lib/deals/ingest";
import { notifyAlertsForDeals } from "@/lib/alerts/match-deals";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";
import { reportSentryException } from "@/lib/observability/sentry";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const ingest = await ingestDeals();
    const recent = await prisma.deal.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
        price: { not: null },
      },
      select: {
        id: true,
        origin: true,
        destination: true,
        price: true,
        currency: true,
        originalUrl: true,
        discountScore: true,
        title: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    const matched = await notifyAlertsForDeals(recent);
    return NextResponse.json({ ok: true, ...ingest, alerts: matched });
  } catch (error) {
    logger.error("cron.deals.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    reportSentryException(error, { tags: { cron: "deals" } });
    return NextResponse.json(
      { error: "Falha ao processar promoções." },
      { status: 500 },
    );
  }
}
