import webpush from "web-push";
import { getEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export function getVapidPublicKey(): string | undefined {
  return (
    getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ||
    getEnv("VAPID_PUBLIC_KEY") ||
    undefined
  );
}

function getVapidPrivateKey(): string | undefined {
  return getEnv("VAPID_PRIVATE_KEY") || undefined;
}

function getVapidSubject(): string {
  return getEnv("VAPID_SUBJECT") || "mailto:admin@example.com";
}

export function isWebPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
}

function configureVapid(): boolean {
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  return true;
}

export type WebPushSendResult = {
  ok: boolean;
  statusCode?: number;
  error?: string;
};

export async function sendWebPush(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  title: string;
  body: string;
  url?: string;
}): Promise<WebPushSendResult> {
  if (!configureVapid()) {
    return { ok: false, error: "VAPID não configurado" };
  }

  try {
    const result = await webpush.sendNotification(
      {
        endpoint: input.endpoint,
        keys: input.keys,
      },
      JSON.stringify({
        title: input.title,
        body: input.body,
        url: input.url ?? "/",
      }),
    );
    return { ok: true, statusCode: result.statusCode };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : undefined;
    logger.error("webpush.send_failed", {
      error: error instanceof Error ? error.message : "unknown",
      statusCode,
    });
    return {
      ok: false,
      statusCode,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}
