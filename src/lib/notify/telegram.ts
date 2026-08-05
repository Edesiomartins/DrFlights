import { getEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export function getTelegramBotToken(): string | undefined {
  return getEnv("TELEGRAM_BOT_TOKEN") || undefined;
}

export function getTelegramBotUsername(): string | undefined {
  const raw = getEnv("TELEGRAM_BOT_USERNAME") || undefined;
  return raw?.replace(/^@/, "");
}

export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken());
}

export type TelegramSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send a Telegram message. Gracefully no-ops when TELEGRAM_BOT_TOKEN is unset.
 */
export async function sendTelegramMessage(input: {
  chatId: string;
  text: string;
  disablePreview?: boolean;
}): Promise<TelegramSendResult> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: input.chatId,
          text: input.text.slice(0, 4000),
          disable_web_page_preview: input.disablePreview ?? false,
        }),
      },
    );
    const json = (await response.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!response.ok || !json.ok) {
      return {
        ok: false,
        error: json.description ?? `Telegram HTTP ${response.status}`,
      };
    }
    return {
      ok: true,
      messageId: json.result?.message_id
        ? String(json.result.message_id)
        : undefined,
    };
  } catch (error) {
    logger.error("telegram.send_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

export function telegramDeepLink(token: string): string | null {
  const username = getTelegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}
