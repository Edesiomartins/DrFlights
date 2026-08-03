import { encode } from "next-auth/jwt";
import type { BrowserContext } from "@playwright/test";

export async function injectSessionCookie(
  context: BrowserContext,
  user: { id: string; email: string; name: string; role?: "USER" | "ADMIN" },
) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET ausente — necessário para injetar sessão E2E");
  }

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? "USER",
    },
    secret,
    salt: "authjs.session-token",
    maxAge: 60 * 60,
  });

  await context.addCookies([
    {
      name: "authjs.session-token",
      value: token,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}
