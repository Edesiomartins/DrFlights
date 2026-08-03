export type PromotionLabel =
  | "Excelente promoção"
  | "Bom preço"
  | "Abaixo da média"
  | "Preço normal"
  | "Histórico insuficiente";

export type PromotionResult = {
  label: PromotionLabel;
  currentPrice: number;
  medianPrice: number | null;
  percentDiff: number | null;
  sampleCount: number;
  periodDays: number;
};

/**
 * Classify current cash price against historical median of lowest prices.
 * Requires ≥5 samples. Never invents a median.
 */
export function classifyPromotion(
  currentPrice: number,
  historicalLowestPrices: number[],
  periodDays = 90,
): PromotionResult {
  const samples = historicalLowestPrices.filter(
    (n) => Number.isFinite(n) && n > 0,
  );

  if (samples.length < 5) {
    return {
      label: "Histórico insuficiente",
      currentPrice,
      medianPrice: null,
      percentDiff: null,
      sampleCount: samples.length,
      periodDays,
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPrice =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);

  const percentDiff = ((medianPrice - currentPrice) / medianPrice) * 100;

  let label: PromotionLabel = "Preço normal";
  if (percentDiff >= 25) label = "Excelente promoção";
  else if (percentDiff >= 15) label = "Bom preço";
  else if (percentDiff >= 8) label = "Abaixo da média";

  return {
    label,
    currentPrice,
    medianPrice,
    percentDiff,
    sampleCount: samples.length,
    periodDays,
  };
}
