import { NextResponse } from "next/server";
import {
  getAirportAttribution,
  searchAirports,
} from "@/lib/airports";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`airports:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de consultas de aeroporto atingido." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "8"), 20);

  if (q.trim().length < 1) {
    return NextResponse.json({ airports: [], attribution: getAirportAttribution() });
  }

  const airports = searchAirports(q, limit);
  return NextResponse.json({
    airports,
    attribution: getAirportAttribution(),
  });
}
