import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { getAppName } from "@/lib/utils/env";

export async function SiteHeader() {
  const session = await auth();
  const appName = getAppName();

  return (
    <header
      className="shell"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "1.25rem 0",
        color: "var(--sand)",
      }}
    >
      <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.45rem", fontWeight: 700 }}>
        {appName}
      </Link>
      <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontWeight: 600, fontSize: "0.95rem" }}>
        <Link href="/">Buscar</Link>
        {session ? (
          <>
            <Link href="/alertas">Alertas</Link>
            <Link href="/historico">Histórico</Link>
            {session.user.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/entrar">Entrar</Link>
            <Link href="/cadastro" className="btn btn-primary" style={{ padding: "0.45rem 0.95rem" }}>
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
