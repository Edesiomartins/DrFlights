import { NextResponse } from "next/server";
import {
  clampTopDealsLimit,
  getTopDeals,
} from "@/lib/deals/top";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`deals-top:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de consultas atingido. Aguarde um minuto." },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const limit = clampTopDealsLimit(url.searchParams.get("limit"));

  try {
    const result = await getTopDeals({ limit });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600, max-age=60",
      },
    });
  } catch (error) {
    logger.error("api.deals.top.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Não foi possível carregar as promoções." },
      { status: 500 },
    );
  }
}
