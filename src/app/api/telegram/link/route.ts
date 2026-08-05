import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  isTelegramConfigured,
  telegramDeepLink,
} from "@/lib/notify/telegram";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramChatId: true,
      telegramLinkedAt: true,
      telegramLinkToken: true,
    },
  });

  return NextResponse.json({
    configured: isTelegramConfigured(),
    linked: Boolean(user?.telegramChatId),
    linkedAt: user?.telegramLinkedAt,
    deepLink: user?.telegramLinkToken
      ? telegramDeepLink(user.telegramLinkToken)
      : null,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const ip = clientIp(request);
  const rl = rateLimit(`telegram-link:${session.user.id}:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite atingido. Aguarde um minuto." },
      { status: 429 },
    );
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram não configurado no servidor." },
      { status: 503 },
    );
  }

  const token = randomBytes(16).toString("hex");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramLinkToken: token },
  });

  const deepLink = telegramDeepLink(token);
  return NextResponse.json({
    token,
    deepLink,
    configured: true,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramChatId: null,
      telegramLinkToken: null,
      telegramLinkedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
