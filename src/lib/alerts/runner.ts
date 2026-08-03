import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/smtp";
import { searchFlights } from "@/lib/flights/search-service";
import type { FlightSearchInput } from "@/lib/flights/types";
import { isSmtpConfigured } from "@/lib/utils/env";
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

export async function runPriceAlerts(): Promise<CronAlertsResult> {
  const smtpReady = isSmtpConfigured();
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
      const input: FlightSearchInput = {
        tripType: alert.returnDateFrom ? "round_trip" : "one_way",
        slices: [
          {
            origin: alert.origin,
            destination: alert.destination,
            departureDate: alert.departureDateFrom,
          },
          ...(alert.returnDateFrom
            ? [
                {
                  origin: alert.destination,
                  destination: alert.origin,
                  departureDate: alert.returnDateFrom,
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

      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: {
          lastCheckedAt: new Date(),
          lastMatchedPrice: best?.totalAmount ?? alert.lastMatchedPrice,
        },
      });

      if (!best?.totalAmount || alert.maxPrice == null) continue;
      if (best.totalAmount > alert.maxPrice) continue;

      const lastNotified = alert.lastNotifiedAt?.getTime() ?? 0;
      const hoursSince =
        (Date.now() - lastNotified) / (1000 * 60 * 60);
      const additionalDrop =
        alert.lastMatchedPrice != null &&
        best.totalAmount <
          alert.lastMatchedPrice * (1 - RELEVANT_DROP_PERCENT / 100);

      if (hoursSince < MIN_NOTIFY_HOURS && !additionalDrop && lastNotified > 0) {
        continue;
      }

      if (!smtpReady) {
        await prisma.notificationLog.create({
          data: {
            alertId: alert.id,
            channel: "email",
            recipient: alert.user.email,
            status: "skipped",
            price: best.totalAmount,
            provider: best.provider,
            error: "SMTP não configurado",
          },
        });
        continue;
      }

      const subject = `Alerta de preço: ${alert.origin} → ${alert.destination}`;
      const text = [
        `Encontramos um preço de ${best.currency ?? alert.currency} ${best.totalAmount.toFixed(2)}`,
        `na rota ${alert.origin} → ${alert.destination}.`,
        `Seu limite: ${alert.currency} ${alert.maxPrice}.`,
        `Fonte: ${best.provider}.`,
        best.bookingUrl ? `Continuar: ${best.bookingUrl}` : "",
        "",
        "Confirme sempre no site do fornecedor antes de comprar.",
      ]
        .filter(Boolean)
        .join("\n");

      const emailResult = await sendEmail({
        to: alert.user.email,
        subject,
        text,
      });

      await prisma.notificationLog.create({
        data: {
          alertId: alert.id,
          channel: "email",
          recipient: alert.user.email,
          status: emailResult.ok ? "sent" : "error",
          price: best.totalAmount,
          provider: best.provider,
          messageId: emailResult.messageId,
          error: emailResult.error,
        },
      });

      if (emailResult.ok) {
        notified += 1;
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastNotifiedAt: new Date() },
        });
      } else {
        errors += 1;
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
    skippedSmtp: !smtpReady,
    errors,
  };
}
