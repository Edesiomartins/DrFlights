import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { AdSpace } from "@/components/ads/ad-space";
import { CookieBanner } from "@/components/ads/cookie-banner";
import { Providers } from "@/components/ui/providers";
import { SiteHeader } from "@/components/ui/site-header";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <SiteHeader />
          <main>{children}</main>
          <footer
            className="shell site-footer"
            style={{
              padding: "2rem 0 3rem",
              color: "rgba(243,235,224,0.72)",
              fontSize: "0.85rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <AdSpace placement="footer" />
            <p>
              Dados de aeroportos derivados de OpenFlights (
              <a
                href="https://openflights.org/data.php"
                style={{ textDecoration: "underline" }}
              >
                openflights.org
              </a>
              ), licença ODbL. Este produto redireciona para o fornecedor para a compra —
              não emite bilhetes. Conteúdo patrocinado é identificado como{" "}
              <strong>Patrocinado</strong>.
            </p>
            <p style={{ margin: 0, display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="/privacidade" style={{ textDecoration: "underline" }}>
                Privacidade
              </a>
              <a href="/afiliados" style={{ textDecoration: "underline" }}>
                Afiliados
              </a>
            </p>
          </footer>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
