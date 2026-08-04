import { AdSpace } from "@/components/ads/ad-space";
import { SearchForm } from "@/components/search/search-form";
import { getAppName } from "@/lib/utils/env";

export default function HomePage() {
  const appName = getAppName();

  return (
    <div className="shell home-page">
      <section className="home-hero">
        <div aria-hidden className="home-orb animate-drift" />
        <div className="home-copy">
          <span className="home-eyebrow">Sua próxima viagem começa aqui</span>
          <h1 className="home-brand">{appName}</h1>
          <p className="home-lead">
            Encontre a melhor forma de voar comparando tarifas em dinheiro e milhas,
            com clareza para escolher e segurança para decidir.
          </p>
          <div className="home-benefits" aria-label="Benefícios da busca">
            <span><i aria-hidden>✓</i> Dinheiro e milhas</span>
            <span><i aria-hidden>✓</i> Múltiplas fontes</span>
            <span><i aria-hidden>✓</i> Comparação inteligente</span>
          </div>
        </div>
        <div className="home-stack">
          <SearchForm />
          <AdSpace placement="home_top" className="home-ad" />
          <AdSpace placement="home_bottom" className="home-ad" />
        </div>
      </section>
    </div>
  );
}
