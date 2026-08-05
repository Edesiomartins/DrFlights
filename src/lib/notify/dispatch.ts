import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/smtp";
import {
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/notify/telegram";
import {
  isWebPushConfigured,
  sendWebPush,
} from "@/lib/notify/web-push";
import { getAppUrl, isSmtpConfigured } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

function absolutizeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getAppUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export type AlertNotifyPayload = {
  alertId: string;
  userId: string;
  email: string;
  telegramChatId?: string | null;
  origin: string;
  destination: string;
  price: number;
  currency: string;
  maxPrice?: number | null;
  provider?: string | null;
  bookingUrl?: string | null;
  discountScore?: number | null;
};

export type NotifyChannelsResult = {
  emailSent: boolean;
  telegramSent: boolean;
  pushSent: boolean;
  anySent: boolean;
};

function buildAlertText(payload: AlertNotifyPayload): string {
  const destLabel =
    payload.destination === "ANY" ? "qualquer destino" : payload.destination;
  const lines = [
    `Alerta de preço: ${payload.origin} → ${destLabel}`,
    `Preço: ${payload.currency} ${payload.price.toFixed(2)}`,
    payload.maxPrice != null
      ? `Seu limite: ${payload.currency} ${payload.maxPrice}`
      : null,
    payload.discountScore != null
      ? `~${Math.round(payload.discountScore)}% abaixo da mediana`
      : null,
    payload.provider ? `Fonte: ${payload.provider}` : null,
    absolutizeUrl(payload.bookingUrl)
      ? `Continuar: ${absolutizeUrl(payload.bookingUrl)}`
      : null,
    "",
    "Confirme sempre no site do fornecedor antes de comprar.",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function dispatchAlertNotifications(
  payload: AlertNotifyPayload,
): Promise<NotifyChannelsResult> {
  const text = buildAlertText(payload);
  const subject = `Alerta de preço: ${payload.origin} → ${
    payload.destination === "ANY" ? "qualquer destino" : payload.destination
  }`;
  let emailSent = false;
  let telegramSent = false;
  let pushSent = false;

  if (isSmtpConfigured()) {
    const emailResult = await sendEmail({
      to: payload.email,
      subject,
      text,
    });
    await prisma.notificationLog.create({
      data: {
        alertId: payload.alertId,
        userId: payload.userId,
        channel: "email",
        recipient: payload.email,
        status: emailResult.ok ? "sent" : "error",
        price: payload.price,
        provider: payload.provider ?? undefined,
        messageId: emailResult.messageId,
        error: emailResult.error,
      },
    });
    emailSent = emailResult.ok;
  } else {
    await prisma.notificationLog.create({
      data: {
        alertId: payload.alertId,
        userId: payload.userId,
        channel: "email",
        recipient: payload.email,
        status: "skipped",
        price: payload.price,
        provider: payload.provider ?? undefined,
        error: "SMTP não configurado",
      },
    });
  }

  if (payload.telegramChatId && isTelegramConfigured()) {
    const tg = await sendTelegramMessage({
      chatId: payload.telegramChatId,
      text,
    });
    await prisma.notificationLog.create({
      data: {
        alertId: payload.alertId,
        userId: payload.userId,
        channel: "telegram",
        recipient: payload.telegramChatId,
        status: tg.ok ? "sent" : "error",
        price: payload.price,
        provider: payload.provider ?? undefined,
        messageId: tg.messageId,
        error: tg.error,
      },
    });
    telegramSent = tg.ok;
  } else if (payload.telegramChatId) {
    await prisma.notificationLog.create({
      data: {
        alertId: payload.alertId,
        userId: payload.userId,
        channel: "telegram",
        recipient: payload.telegramChatId,
        status: "skipped",
        price: payload.price,
        error: "TELEGRAM_BOT_TOKEN não configurado",
      },
    });
  }

  if (isWebPushConfigured()) {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: payload.userId },
    });
    for (const sub of subs) {
      const push = await sendWebPush({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
        title: subject,
        body: text.split("\n").slice(0, 3).join(" · "),
        url: absolutizeUrl("/alertas") ?? `${getAppUrl()}/alertas`,
      });
      await prisma.notificationLog.create({
        data: {
          alertId: payload.alertId,
          userId: payload.userId,
          channel: "webpush",
          recipient: sub.endpoint.slice(0, 180),
          status: push.ok ? "sent" : push.statusCode === 410 ? "gone" : "error",
          price: payload.price,
          provider: payload.provider ?? undefined,
          error: push.error,
        },
      });
      if (push.ok) pushSent = true;
      if (push.statusCode === 404 || push.statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => undefined);
      }
    }
  }

  if (!emailSent && !telegramSent && !pushSent) {
    logger.info("notify.no_channel_delivered", { alertId: payload.alertId });
  }

  return {
    emailSent,
    telegramSent,
    pushSent,
    anySent: emailSent || telegramSent || pushSent,
  };
}
