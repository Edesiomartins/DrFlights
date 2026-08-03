import { NextResponse } from "next/server";
import { reportMonitoringEvent } from "@/lib/monitoring";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`monitoring:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { message?: string; digest?: string; path?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  reportMonitoringEvent({
    type: "client_error",
    message: String(body.message ?? "client_error").slice(0, 300),
    tags: {
      digest: body.digest ? String(body.digest).slice(0, 80) : undefined,
      path: body.path ? String(body.path).slice(0, 120) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
