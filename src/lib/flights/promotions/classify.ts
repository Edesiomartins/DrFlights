export type PromotionLabel =
  | "FALHA DE TARIFA (BUG FARE)"
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
  zScore?: number;
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base]! + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1]! - sorted[base]!) : 0);
}

/**
 * Classify current cash price against historical median of lowest prices.
 * Uses Z-Score and Interquartile Range (IQR) for Bug Fare / Anomaly detection.
 * Requires ≥5 samples.
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
  const p25 = quantile(sorted, 0.25);
  const medianPrice = quantile(sorted, 0.5);
  const p75 = quantile(sorted, 0.75);
  const iqr = Math.max(medianPrice * 0.1, p75 - p25);

  const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
  const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  const zScore = stdDev > 0 ? (currentPrice - mean) / stdDev : 0;

  const percentDiff = ((medianPrice - currentPrice) / medianPrice) * 100;

  let label: PromotionLabel = "Preço normal";
  
  // Bug fare: Preço 50%+ abaixo da mediana E (Z-Score <-2.2 OU abaixo de P25 - 1.75 * IQR)
  if (percentDiff >= 50 && (zScore <= -2.2 || currentPrice < p25 - 1.75 * iqr)) {
    label = "FALHA DE TARIFA (BUG FARE)";
  } else if (percentDiff >= 30 || (percentDiff >= 20 && currentPrice <= p25 - 1.25 * iqr)) {
    label = "Excelente promoção";
  } else if (percentDiff >= 15) {
    label = "Bom preço";
  } else if (percentDiff >= 8) {
    label = "Abaixo da média";
  }

  return {
    label,
    currentPrice,
    medianPrice,
    percentDiff,
    sampleCount: samples.length,
    periodDays,
    zScore: Math.round(zScore * 100) / 100,
  };
}

