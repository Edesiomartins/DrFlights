import { AdSpace } from "@/components/ads/ad-space";
import { ResultsClient } from "@/components/flights/results-client";
import { getAdSlotsByPlacement } from "@/lib/ads/config";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ResultadosPage({ searchParams }: Props) {
  const params = await searchParams;
  let payload: unknown = null;
  try {
    payload = params.q ? JSON.parse(params.q) : null;
  } catch {
    payload = null;
  }

  const inlineAds = getAdSlotsByPlacement("results_inline");

  return (
    <div className="shell" style={{ padding: "1rem 0 3rem" }}>
      <h1
        style={{
          color: "var(--sand)",
          fontFamily: "var(--font-display)",
          fontSize: "2rem",
          marginBottom: "1rem",
        }}
      >
        Resultados
      </h1>
      <AdSpace placement="results_top" style={{ marginBottom: "1rem", color: "var(--ink)" }} />
      {!payload ? (
        <div className="glass" style={{ borderRadius: "1.25rem", padding: "1.5rem" }}>
          Nenhuma busca informada. Volte à página inicial e preencha o formulário.
        </div>
      ) : (
        <ResultsClient queryPayload={payload} inlineAds={inlineAds} />
      )}
    </div>
  );
}
