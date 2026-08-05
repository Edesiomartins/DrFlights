import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { isWebPushConfigured } from "@/lib/notify/web-push";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(10).max(512),
    auth: z.string().min(8).max(256),
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const count = await prisma.pushSubscription.count({
    where: { userId: session.user.id },
  });
  return NextResponse.json({
    configured: isWebPushConfigured(),
    subscriptions: count,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push não configurado." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const rl = rateLimit(`push-sub:${session.user.id}:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite atingido." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Assinatura inválida.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: session.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    update: {
      userId: session.user.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: sub.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const endpoint =
    typeof body === "object" &&
    body &&
    "endpoint" in body &&
    typeof (body as { endpoint?: unknown }).endpoint === "string"
      ? (body as { endpoint: string }).endpoint
      : null;

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id, endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({ ok: true });
}
