import { NextResponse } from "next/server";
import {
  getAirportAttribution,
  searchAirports,
} from "@/lib/airports";

export async function GET(request: Request) {
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
