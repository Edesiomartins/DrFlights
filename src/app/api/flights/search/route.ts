import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { flightSearchSchema } from "@/lib/flights/validation";
import { searchFlights } from "@/lib/flights/search-service";
import { reportSentryException } from "@/lib/observability/sentry";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getDefaultCurrency } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`search:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de buscas atingido. Aguarde um minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = flightSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de busca inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await auth();
  const input = {
    ...parsed.data,
    currency: parsed.data.currency ?? getDefaultCurrency(),
  };

  try {
    const result = await searchFlights(input, {
      userId: session?.user?.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error("api.flights.search.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    reportSentryException(error, {
      tags: {
        route: `${input.slices[0]?.origin}-${input.slices[0]?.destination}`,
        area: "flights.search",
      },
    });
    return NextResponse.json(
      { error: "Não foi possível concluir a busca no momento." },
      { status: 500 },
    );
  }
}
