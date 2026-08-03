import { AdSpace } from "@/components/ads/ad-space";
import { SearchForm } from "@/components/search/search-form";
import { getAppName } from "@/lib/utils/env";

export default function HomePage() {
  const appName = getAppName();

  return (
    <div className="shell" style={{ paddingBottom: "3rem" }}>
      <section
        style={{
          minHeight: "calc(100vh - 7rem)",
          display: "grid",
          alignContent: "center",
          gap: "1.5rem",
          color: "var(--sand)",
          position: "relative",
          overflow: "hidden",
        }}
      >
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
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.8rem, 8vw, 5.2rem)",
            lineHeight: 0.95,
            margin: 0,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            maxWidth: "12ch",
          }}
        >
          {appName}
        </p>
        <p style={{ margin: 0, maxWidth: "38ch", fontSize: "1.15rem", opacity: 0.9 }}>
          Compare dinheiro e milhas em um só lugar e siga para o fornecedor na hora de comprar.
        </p>
        <AdSpace placement="home_top" style={{ maxWidth: 920, color: "var(--ink)" }} />
        <div style={{ maxWidth: 920 }}>
          <SearchForm />
        </div>
        <AdSpace placement="home_bottom" style={{ maxWidth: 920, color: "var(--ink)" }} />
      </section>
    </div>
  );
}
