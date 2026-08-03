import { AdSpace } from "@/components/ads/ad-space";
import { SearchForm } from "@/components/search/search-form";
import { getAppName } from "@/lib/utils/env";

export default function HomePage() {
  const appName = getAppName();

  return (
    <div className="shell" style={{ paddingBottom: "3rem" }}>
      <section className="home-hero">
        <div
          aria-hidden
          className="animate-drift"
          style={{
            position: "absolute",
            inset: "8% -5% auto auto",
            width: "min(520px, 70vw)",
            height: "min(520px, 70vw)",
            borderRadius: "40% 60% 55% 45%",
            background:
              "radial-gradient(circle at 30% 30%, rgba(243,235,224,0.28), rgba(61,184,168,0.08) 55%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <p className="home-brand">{appName}</p>
        <p className="home-lead">
          Compare dinheiro e milhas em um só lugar e siga para o fornecedor na hora de comprar.
        </p>
        <AdSpace placement="home_top" style={{ maxWidth: 920, color: "var(--ink)" }} />
        <div style={{ maxWidth: 920, width: "100%" }}>
          <SearchForm />
        </div>
        <AdSpace placement="home_bottom" style={{ maxWidth: 920, color: "var(--ink)" }} />
      </section>
    </div>
  );
}
