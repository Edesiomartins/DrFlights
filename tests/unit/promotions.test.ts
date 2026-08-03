import { describe, expect, it } from "vitest";
import { classifyPromotion } from "@/lib/flights/promotions/classify";

describe("classifyPromotion", () => {
  it("returns insufficient history below 5 samples", () => {
    const result = classifyPromotion(100, [120, 130, 110, 125]);
    expect(result.label).toBe("Histórico insuficiente");
    expect(result.medianPrice).toBeNull();
  });

  it("labels excellent promo at >=25% below median", () => {
    const history = [1000, 1100, 900, 950, 1050];
    const result = classifyPromotion(700, history);
    expect(result.label).toBe("Excelente promoção");
    expect(result.percentDiff).toBeGreaterThanOrEqual(25);
  });

  it("labels normal when close to median", () => {
    const history = [1000, 1000, 1000, 1000, 1000];
    const result = classifyPromotion(980, history);
    expect(result.label).toBe("Preço normal");
  });
});
