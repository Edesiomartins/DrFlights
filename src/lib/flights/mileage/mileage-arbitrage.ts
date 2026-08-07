import type { NormalizedFlightOffer } from "@/lib/flights/types";

/**
 * Preço médio estimado de mercado por 1.000 milhas/pontos no Brasil (em BRL).
 * Pode ser sobrescrito por configurações do usuário ou cotações em tempo real.
 */
export const DEFAULT_MILHEIRO_PRICES: Record<string, number> = {
  smiles: 15.5,
  latam: 24.0,
  latampass: 24.0,
  azul: 16.0,
  tudoazul: 16.0,
  livelo: 35.0,
  esfera: 35.0,
  aadvantage: 75.0,
  iberia: 65.0,
  flyingblue: 70.0,
  tap: 32.0,
  united: 80.0,
  delta: 75.0,
  default: 20.0,
};

export function getMilheiroCost(programName?: string): number {
  const fallback = DEFAULT_MILHEIRO_PRICES["default"] ?? 20.0;
  if (!programName) return fallback;
  const key = programName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return DEFAULT_MILHEIRO_PRICES[key] ?? fallback;
}

/**
 * Calcula a arbitragem monetária de emissão por milhas vs. dinheiro.
 */
export function computeMileageArbitrage(
  offer: NormalizedFlightOffer,
  equivalentCashPrice?: number,
  bonusPercent: number = 0,
): NormalizedFlightOffer["mileageArbitrage"] | undefined {
  if (offer.priceType !== "points" || !offer.pointsAmount || offer.pointsAmount <= 0) {
    return undefined;
  }

  const programCostPerThousand = getMilheiroCost(offer.pointsProgram);
  const taxesAmount = offer.taxesAmount ?? 0;
  
  // Se houver bônus de transferência (ex: 100% bônus), os pontos efetivos transferidos são reduzidos
  const effectivePoints = bonusPercent > 0 
    ? offer.pointsAmount / (1 + bonusPercent / 100) 
    : offer.pointsAmount;

  const cashEquivalent = (effectivePoints / 1000) * programCostPerThousand + taxesAmount;
  
  const refCashPrice = equivalentCashPrice ?? (offer.totalAmount && offer.totalAmount > 0 ? offer.totalAmount : undefined);

  let cpm = 0;
  let savingsPercent = 0;
  let recommendation: "EMITIR EM MILHAS" | "EMITIR EM DINHEIRO" | "EQUIVALENTE" = "EQUIVALENTE";

  if (refCashPrice && refCashPrice > taxesAmount) {
    // CPM gerado: quanto cada 1.000 milhas economiza em relação ao valor da passagem em dinheiro
    const savedMoney = refCashPrice - taxesAmount;
    cpm = (savedMoney / offer.pointsAmount) * 1000;
    
    savingsPercent = Math.round(((refCashPrice - cashEquivalent) / refCashPrice) * 100);

    if (cashEquivalent < refCashPrice * 0.88) {
      recommendation = "EMITIR EM MILHAS";
    } else if (refCashPrice < cashEquivalent * 0.92) {
      recommendation = "EMITIR EM DINHEIRO";
    } else {
      recommendation = "EQUIVALENTE";
    }
  } else {
    cpm = programCostPerThousand;
    savingsPercent = 0;
    recommendation = "EMITIR EM MILHAS";
  }

  return {
    cpm: Math.round(cpm * 100) / 100,
    programCostPerThousand,
    cashEquivalent: Math.round(cashEquivalent * 100) / 100,
    taxesAmount,
    savingsPercent,
    recommendation,
  };
}
