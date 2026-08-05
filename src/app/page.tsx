import { AdSpace } from "@/components/ads/ad-space";
import { HomeScrollSplit } from "@/components/home/home-scroll-split";
import { SearchForm } from "@/components/search/search-form";
import { getAppName } from "@/lib/utils/env";

export default function HomePage() {
  const appName = getAppName();

  return (
    <div className="home-page">
      <section className="home-hero">
        <svg className="home-route-art" viewBox="0 0 560 280" aria-hidden>
          <path d="M28 220C130 35 356 324 530 58" />
          <circle cx="28" cy="220" r="6" />
          <circle cx="530" cy="58" r="6" />
          <g className="home-route-plane" transform="translate(383 148) rotate(-38)">
            <path d="M0 10 31 0 22 14l12 7-4 4-15-4-8 9-4-2 4-11-7-4Z" />
          </g>
        </svg>
        <div className="home-copy">
          <span className="home-eyebrow">Sua próxima viagem começa aqui</span>
          <h1 className="home-brand">{appName}</h1>
          <p className="home-lead">
            Encontre a melhor forma de voar comparando tarifas em dinheiro e milhas,
            com clareza para escolher e segurança para decidir.
          </p>
        </div>
        <div className="home-search-wrap shell">
          <SearchForm />
        </div>
      </section>

      <HomeScrollSplit />

      <section className="home-after shell" aria-labelledby="benefits-title">
        <div className="section-heading">
          <span className="section-kicker">Escolha com confiança</span>
          <h2 id="benefits-title">Uma busca, todas as possibilidades</h2>
        </div>
        <div className="home-benefits">
          <article className="benefit-card">
            <span className="benefit-icon" aria-hidden>R$</span>
            <h3>Dinheiro e milhas</h3>
            <p>Compare o custo real de cada opção na mesma busca.</p>
          </article>
          <article className="benefit-card">
            <span className="benefit-icon" aria-hidden>⌁</span>
            <h3>Múltiplas fontes</h3>
            <p>Consulte diferentes provedores sem abrir várias abas.</p>
          </article>
          <article className="benefit-card">
            <span className="benefit-icon" aria-hidden>✓</span>
            <h3>Comparação inteligente</h3>
            <p>Preço, duração, escalas e bagagem em uma decisão clara.</p>
          </article>
        </div>
        <div className="home-ads">
          <AdSpace placement="home_top" className="home-ad" />
          <AdSpace placement="home_bottom" className="home-ad" />
        </div>
      </section>
    </div>
  );
}

