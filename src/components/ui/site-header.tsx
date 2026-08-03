import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { getAppName } from "@/lib/utils/env";

export async function SiteHeader() {
  const session = await auth();
  const appName = getAppName();

  return (
    <header className="site-header shell">
      <Link href="/" className="site-logo">
        {appName}
      </Link>
      <nav className="site-nav" aria-label="Principal">
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
            <Link href="/cadastro" className="btn btn-primary site-nav-cta">
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
