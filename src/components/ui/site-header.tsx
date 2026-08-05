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
        <svg viewBox="0 0 24 24" aria-hidden><path d="m3 13 7.4-2.2L8 4.4 10 3l4.5 6.5 5.2-1.6c1.2-.4 2.2.1 2.3.8.1.7-.7 1.4-1.9 1.8l-5.3 1.6-1.2 7.8-2.4.7-.9-7-3.7 1.1-1.4 2.4-1.6.5.2-3.2L3 13Z" /></svg>
        {appName}
      </Link>
      <nav className="site-nav" aria-label="Principal">
        <Link href="/">Buscar</Link>
        <Link href="/promocoes">Promoções</Link>
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
