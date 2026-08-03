import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminEmails } from "@/lib/utils/env";
import {
  hashPassword,
  normalizeEmail,
  validatePasswordStrength,
} from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/flights/validation";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`register:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const passwordError = validatePasswordStrength(parsed.data.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Não foi possível criar a conta com estes dados." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const role = getAdminEmails().has(email) ? Role.ADMIN : Role.USER;

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
