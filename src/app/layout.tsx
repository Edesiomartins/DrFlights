import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";
import { AdSpace } from "@/components/ads/ad-space";
import { CookieBanner } from "@/components/ads/cookie-banner";
import { Providers } from "@/components/ui/providers";
import { PwaRegister } from "@/components/ui/pwa-register";
import { SiteHeader } from "@/components/ui/site-header";
import { SiteMarquee } from "@/components/ui/site-marquee";
import { getAppName } from "@/lib/utils/env";
import "./globals.css";

export const dynamic = "force-dynamic";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: getAppName(),
  description:
    "Metabuscador de passagens aéreas — compare preços em dinheiro e milhas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: getAppName(),
  },
  other: {
    "theme-color": "#0f1720",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName = getAppName();

  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <PwaRegister />
          <SiteHeader />
          <SiteMarquee appName={appName} />
          <main>{children}</main>
          <footer className="site-footer">
            <div className="shell site-footer-inner">
              <div className="site-footer-brand">
                <strong>{appName}</strong>
                <p>Compare tarifas em dinheiro e milhas para viajar com mais clareza.</p>
              </div>
              <div className="site-footer-column">
                <strong>Produto</strong>
                <Link href="/">Buscar voos</Link>
                <Link href="/alertas">Alertas de preço</Link>
                <Link href="/promocoes">Promoções</Link>
                <Link href="/historico">Histórico</Link>
              </div>
              <div className="site-footer-column">
                <strong>Legal</strong>
                <Link href="/privacidade">Privacidade</Link>
                <Link href="/afiliados">Afiliados</Link>
              </div>
              <div className="site-footer-column">
                <strong>Fontes de dados</strong>
                <p>
                  Aeroportos derivados de{" "}
                  <a href="https://openflights.org/data.php">OpenFlights</a>, licença ODbL.
                </p>
              </div>
              <div className="site-footer-ad"><AdSpace placement="footer" /></div>
              <p className="site-footer-disclaimer">
                Redirecionamos ao fornecedor para concluir a compra; não emitimos bilhetes.
                Conteúdo comercial é identificado como <strong>Patrocinado</strong>.
              </p>
            </div>
          </footer>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
