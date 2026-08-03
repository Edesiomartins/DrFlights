import { NextResponse } from "next/server";
import { runPriceAlerts } from "@/lib/alerts/runner";
import { logger } from "@/lib/utils/logger";

function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor." },
      { status: 503 },
    );
  }

  const token = extractBearer(request);
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runPriceAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("cron.alerts.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Falha ao processar alertas." },
      { status: 500 },
    );
  }
}
