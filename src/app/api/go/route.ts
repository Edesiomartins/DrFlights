import { NextResponse } from "next/server";
import { logAffiliateClick } from "@/lib/ads/clicks";
import { getAdSlotById, isSafeHttpUrl } from "@/lib/ads/config";
import { getAppUrl } from "@/lib/utils/env";
import { clientIp } from "@/lib/security/rate-limit";

/**
 * Affiliate / outbound redirect with click logging.
 * Query: to (url), placement, partner?, slot?
 * If `slot` is provided and found, destination comes from ADS_CONFIG_JSON.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get("slot")?.trim() || undefined;
  const placement = (searchParams.get("placement") ?? "external").slice(0, 80);
  const partner = searchParams.get("partner")?.trim() || undefined;
  let target = searchParams.get("to")?.trim() ?? "";

  if (slotId) {
    const slot = getAdSlotById(slotId);
    if (slot) {
      target = slot.targetUrl;
    }
  }

  if (!target) {
    return NextResponse.json({ error: "Destino ausente." }, { status: 400 });
  }

  // Allow internal absolute paths for policy links in demo ads.
  if (target.startsWith("/")) {
    const absolute = new URL(target, getAppUrl()).toString();
    await logAffiliateClick({
      placement,
      partner,
      slotId,
      targetUrl: absolute,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      ip: clientIp(request),
    });
    return NextResponse.redirect(absolute, 302);
  }

  if (!isSafeHttpUrl(target)) {
    return NextResponse.json({ error: "URL de destino inválida." }, { status: 400 });
  }

  await logAffiliateClick({
    placement,
    partner,
    slotId,
    targetUrl: target,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    ip: clientIp(request),
  });

  return NextResponse.redirect(target, 302);
}
