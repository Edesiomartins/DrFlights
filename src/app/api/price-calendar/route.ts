import { NextResponse } from "next/server";
import { fetchTravelpayoutsCalendar } from "@/lib/flights/calendar/travelpayouts-calendar";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`calendar:${ip}`, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de consultas ao calendário. Aguarde." },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const origin = (url.searchParams.get("origin") ?? "").toUpperCase();
  const destination = (url.searchParams.get("destination") ?? "").toUpperCase();
  const currency = (url.searchParams.get("currency") ?? "BRL").toUpperCase();
  const month = url.searchParams.get("month") ?? undefined;

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return NextResponse.json(
      { error: "Origem e destino IATA inválidos." },
      { status: 400 },
    );
  }

  const result = await fetchTravelpayoutsCalendar({
    origin,
    destination,
    currency,
    month: month ?? undefined,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
