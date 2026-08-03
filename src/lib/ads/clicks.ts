import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";

export type LogAffiliateClickInput = {
  placement: string;
  partner?: string;
  slotId?: string;
  targetUrl: string;
  userAgent?: string | null;
  referer?: string | null;
  ip?: string | null;
};

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function logAffiliateClick(
  input: LogAffiliateClickInput,
): Promise<void> {
  try {
    await prisma.affiliateClick.create({
      data: {
        placement: input.placement.slice(0, 80),
        partner: input.partner?.slice(0, 80),
        slotId: input.slotId?.slice(0, 80),
        targetUrl: input.targetUrl.slice(0, 2000),
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        referer: input.referer?.slice(0, 500) ?? null,
        ipHash: input.ip ? hashIp(input.ip) : null,
      },
    });
  } catch (error) {
    logger.error("affiliate.click_log_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
