import { NextResponse } from "next/server";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/notify/web-push";

export async function GET() {
  return NextResponse.json({
    configured: isWebPushConfigured(),
    publicKey: getVapidPublicKey() ?? null,
  });
}
