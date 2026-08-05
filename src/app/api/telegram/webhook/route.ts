import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getTelegramBotToken,
  sendTelegramMessage,
} from "@/lib/notify/telegram";
import { logger } from "@/lib/utils/logger";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
};

/**
 * Telegram bot webhook: /start <linkToken> binds chatId to User.
 * Set webhook URL to https://APP_URL/api/telegram/webhook
 */
export async function POST(request: Request) {
  const token = getTelegramBotToken();
  if (!token) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Optional shared secret via query (?secret=CRON_SECRET) when configured
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    const q = url.searchParams.get("secret");
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (q !== secret && header !== secret) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (chatId == null || !text) {
    return NextResponse.json({ ok: true });
  }

  const startMatch = text.match(/^\/start(?:\s+(.+))?$/i);
  if (!startMatch) {
    return NextResponse.json({ ok: true });
  }

  const linkToken = startMatch[1]?.trim();
  if (!linkToken) {
    await sendTelegramMessage({
      chatId: String(chatId),
      text: "Para vincular sua conta, gere o link em Alertas no DrFlights e abra pelo botão do Telegram.",
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { telegramLinkToken: linkToken },
    });
    if (!user) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text: "Token inválido ou expirado. Gere um novo vínculo em Alertas.",
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: String(chatId),
        telegramLinkedAt: new Date(),
        telegramLinkToken: null,
      },
    });

    await sendTelegramMessage({
      chatId: String(chatId),
      text: "Conta vinculada! Você receberá alertas de preço neste chat.",
    });
  } catch (error) {
    logger.error("telegram.webhook_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
