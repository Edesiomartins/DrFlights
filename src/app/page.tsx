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
          <p className="home-brand">{appName}</p>
          <p className="home-lead">
            Compare dinheiro e milhas em um só lugar e siga para o fornecedor na hora de comprar.
          </p>
        </div>
        <div className="home-stack">
          <AdSpace placement="home_top" className="home-ad" />
          <SearchForm />
          <AdSpace placement="home_bottom" className="home-ad" />
        </div>
      </section>
    </div>
  );
}
