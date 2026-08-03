import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
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
          <footer className="shell" style={{ padding: "2rem 0 3rem", color: "rgba(243,235,224,0.72)", fontSize: "0.85rem" }}>
            <p>
              Dados de aeroportos derivados de OpenFlights (
              <a href="https://openflights.org/data.php" style={{ textDecoration: "underline" }}>
                openflights.org
              </a>
              ), licença ODbL. Este produto redireciona para o fornecedor para a compra —
              não emite bilhetes.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
