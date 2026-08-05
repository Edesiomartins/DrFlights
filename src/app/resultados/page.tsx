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
    <div className="shell page-shell results-page">
      <h1 className="page-title">
        Resultados
      </h1>
      <AdSpace placement="results_top" className="results-top-ad" />
      {!payload ? (
        <div className="glass results-feedback">
          Nenhuma busca informada. Volte à página inicial e preencha o formulário.
        </div>
      ) : (
        <ResultsClient queryPayload={payload} inlineAds={inlineAds} />
      )}
    </div>
  );
}
