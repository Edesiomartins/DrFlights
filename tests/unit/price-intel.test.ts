import { describe, expect, it } from "vitest";
import { robustStats } from "@/lib/price-intel/stats";

describe("robust price statistics", () => {
  it("uses quantiles and MAD without being distorted by one outlier", () => {
    const stats = robustStats([400, 450, 500, 550, 5000]);
    expect(stats.median).toBe(500);
    expect(stats.p25).toBe(450);
    expect(stats.p75).toBe(550);
    expect(stats.mad).toBe(50);
  });
});
