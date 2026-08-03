import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth/config";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = rateLimit(`login:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return Response.json(
      { error: "Muitas tentativas de login. Aguarde um minuto." },
      { status: 429 },
    );
  }
  return handlers.POST(request);
}
