import { prisma } from "@/lib/db/prisma";
import { dispatchAlertNotifications } from "@/lib/notify/dispatch";
import { searchFlights } from "@/lib/flights/search-service";
import type { FlightSearchInput } from "@/lib/flights/types";
import { scoreDealAnomaly } from "@/lib/deals/anomaly";
import { buildGoUrl } from "@/lib/ads/config";
import { logger } from "@/lib/utils/logger";

const BATCH_SIZE = 10;
const MIN_NOTIFY_HOURS = 24;
const RELEVANT_DROP_PERCENT = 5;

export type CronAlertsResult = {
  checked: number;
  notified: number;
  skippedSmtp: boolean;
  errors: number;
};

function pickMidDate(from: string, to: string): string {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return from;
  const mid = new Date((a + b) / 2);
  return mid.toISOString().slice(0, 10);
}

export async function runPriceAlerts(): Promise<CronAlertsResult> {
  const alerts = await prisma.priceAlert.findMany({
    where: { active: true },
    include: { user: true },
    orderBy: { lastCheckedAt: "asc" },
    take: BATCH_SIZE,
  });

  let notified = 0;
  let errors = 0;

  for (const alert of alerts) {
    try {
      let effectivePrice: number | undefined;
      let effectiveProvider: string | undefined;
      let bookingUrl: string | undefined;
      let discountScore: number | null | undefined;
      let matchedDestination = alert.destination;

      if (alert.anyDestination || alert.destination === "ANY") {
        const deal = await prisma.deal.findFirst({
          where: {
            status: { in: ["NEW", "VERIFIED"] },
            origin: alert.origin,
            price:
              alert.maxPrice != null
                ? { lte: alert.maxPrice, not: null }
                : { not: null },
            publishedAt: { gte: new Date(Date.now() - 14 * 86400000) },
            ...(alert.promoOnly ? { discountScore: { gte: 15 } } : {}),
          },
          orderBy: { price: "asc" },
        });
        if (deal?.price != null) {
          effectivePrice = deal.price;
          effectiveProvider = "deal-radar";
          matchedDestination = deal.destination ?? "ANY";
          discountScore = deal.discountScore;
          bookingUrl = buildGoUrl({
            to: deal.originalUrl,
            placement: "deals",
            partner: deal.sourceId,
          });
        }
      } else {
        const depart = pickMidDate(
          alert.departureDateFrom,
          alert.departureDateTo,
        );
        const returnDate = alert.returnDateFrom
          ? pickMidDate(
              alert.returnDateFrom,
              alert.returnDateTo ?? alert.returnDateFrom,
            )
          : null;

        const input: FlightSearchInput = {
          tripType: returnDate ? "round_trip" : "one_way",
          slices: [
            {
              origin: alert.origin,
              destination: alert.destination,
              departureDate: depart,
            },
            ...(returnDate
              ? [
                  {
                    origin: alert.destination,
                    destination: alert.origin,
                    departureDate: returnDate,
                  },
                ]
              : []),
          ],
          adults: alert.adults,
          children: alert.children,
          infants: 0,
          cabin: alert.cabin as FlightSearchInput["cabin"],
          maxStops: alert.maxStops ?? undefined,
          currency: alert.currency,
        };

        const result = await searchFlights(input, {
          userId: alert.userId,
          bypassCache: true,
        });

        const cashOffers = result.offers.filter(
          (o) =>
            o.priceType === "cash" &&
            o.totalAmount != null &&
            (!alert.maxStops || o.totalStops <= alert.maxStops),
        );
        const best = cashOffers.sort(
          (a, b) => (a.totalAmount ?? Infinity) - (b.totalAmount ?? Infinity),
        )[0];
        const matchingDeal = await prisma.deal.findFirst({
          where: {
            status: { in: ["NEW", "VERIFIED"] },
            origin: alert.origin,
            destination: alert.destination,
            price: { not: null },
            publishedAt: { gte: new Date(Date.now() - 14 * 86400000) },
          },
          orderBy: { price: "asc" },
        });

        const dealPrice = matchingDeal?.price;
        const offerPrice = best?.totalAmount;
        if (
          dealPrice != null &&
          (offerPrice == null || dealPrice < offerPrice)
        ) {
          effectivePrice = dealPrice;
          effectiveProvider = "deal-radar";
          discountScore = matchingDeal?.discountScore;
          bookingUrl = matchingDeal
            ? buildGoUrl({
                to: matchingDeal.originalUrl,
                placement: "deals",
                partner: "deal-radar",
              })
            : undefined;
        } else if (offerPrice != null) {
          effectivePrice = offerPrice;
          effectiveProvider = best?.provider;
          bookingUrl = best?.bookingUrl;
          const anomaly = await scoreDealAnomaly(
            alert.origin,
            alert.destination,
            offerPrice,
          );
          discountScore = anomaly?.discountScore ?? null;
        }
      }

      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: {
          lastCheckedAt: new Date(),
          lastMatchedPrice: effectivePrice ?? alert.lastMatchedPrice,
        },
      });

      if (effectivePrice == null) continue;
      if (alert.maxPrice != null && effectivePrice > alert.maxPrice) continue;
      if (alert.promoOnly && (discountScore == null || discountScore < 15)) {
        continue;
      }
      if (alert.maxPrice == null && !alert.promoOnly) continue;

      const lastNotified = alert.lastNotifiedAt?.getTime() ?? 0;
      const hoursSince = (Date.now() - lastNotified) / (1000 * 60 * 60);
      const additionalDrop =
        alert.lastMatchedPrice != null &&
        effectivePrice <
          alert.lastMatchedPrice * (1 - RELEVANT_DROP_PERCENT / 100);

      if (hoursSince < MIN_NOTIFY_HOURS && !additionalDrop && lastNotified > 0) {
        continue;
      }

      const result = await dispatchAlertNotifications({
        alertId: alert.id,
        userId: alert.userId,
        email: alert.user.email,
        telegramChatId: alert.user.telegramChatId,
        origin: alert.origin,
        destination: matchedDestination,
        price: effectivePrice,
        currency: alert.currency,
        maxPrice: alert.maxPrice,
        provider: effectiveProvider,
        bookingUrl,
        discountScore,
      });

      if (result.anySent) {
        notified += 1;
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastNotifiedAt: new Date() },
        });
      }
    } catch (error) {
      errors += 1;
      logger.error("alerts.run_item_failed", {
        alertId: alert.id,
        error: error instanceof Error ? error.message : "unknown",
      });
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { lastCheckedAt: new Date() },
      });
    }
  }

  return {
    checked: alerts.length,
    notified,
    skippedSmtp: false,
    errors,
  };
}
