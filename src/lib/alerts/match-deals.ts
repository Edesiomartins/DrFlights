import { prisma } from "@/lib/db/prisma";
import { dispatchAlertNotifications } from "@/lib/notify/dispatch";
import { buildGoUrl } from "@/lib/ads/config";
import { logger } from "@/lib/utils/logger";

export type DealCandidate = {
  id: string;
  origin: string | null;
  destination: string | null;
  price: number | null;
  currency: string | null;
  originalUrl: string;
  discountScore: number | null;
  title: string;
};

/**
 * Match recently ingested deals against active price alerts and notify.
 * Used by deals cron for near-instant promo push (Telegram/email/webpush).
 */
export async function notifyAlertsForDeals(
  deals: DealCandidate[],
): Promise<{ matched: number; notified: number }> {
  const priced = deals.filter(
    (d) =>
      d.price != null &&
      d.origin &&
      Number.isFinite(d.price) &&
      d.price > 0,
  );
  if (priced.length === 0) return { matched: 0, notified: 0 };

  const origins = [...new Set(priced.map((d) => d.origin!))];
  const alerts = await prisma.priceAlert.findMany({
    where: {
      active: true,
      origin: { in: origins },
      OR: [{ maxPrice: { not: null } }, { promoOnly: true }],
    },
    include: { user: true },
  });

  let matched = 0;
  let notified = 0;
  const MIN_NOTIFY_HOURS = 6;

  for (const alert of alerts) {
    const candidates = priced.filter((deal) => {
      if (deal.origin !== alert.origin) return false;
      if (!alert.anyDestination && alert.destination !== "ANY") {
        if (deal.destination !== alert.destination) return false;
      }
      if (alert.maxPrice != null && (deal.price ?? Infinity) > alert.maxPrice) {
        return false;
      }
      if (alert.promoOnly && (deal.discountScore == null || deal.discountScore < 15)) {
        return false;
      }
      return true;
    });

    const best = candidates.sort(
      (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    )[0];
    if (!best?.price) continue;
    matched += 1;

    const hoursSince =
      (Date.now() - (alert.lastNotifiedAt?.getTime() ?? 0)) / (1000 * 60 * 60);
    if (alert.lastNotifiedAt && hoursSince < MIN_NOTIFY_HOURS) continue;

    try {
      const bookingUrl = buildGoUrl({
        to: best.originalUrl,
        placement: "deals",
        partner: "deal-radar",
      });
      const result = await dispatchAlertNotifications({
        alertId: alert.id,
        userId: alert.userId,
        email: alert.user.email,
        telegramChatId: alert.user.telegramChatId,
        origin: alert.origin,
        destination: alert.anyDestination ? "ANY" : best.destination ?? alert.destination,
        price: best.price,
        currency: best.currency ?? alert.currency,
        maxPrice: alert.maxPrice,
        provider: "deal-radar",
        bookingUrl,
        discountScore: best.discountScore,
      });

      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: {
          lastCheckedAt: new Date(),
          lastMatchedPrice: best.price,
          ...(result.anySent ? { lastNotifiedAt: new Date() } : {}),
        },
      });
      if (result.anySent) notified += 1;
    } catch (error) {
      logger.error("alerts.deal_match_failed", {
        alertId: alert.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return { matched, notified };
}
