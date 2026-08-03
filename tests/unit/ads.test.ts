import { describe, expect, it } from "vitest";
import { buildGoUrl, isSafeHttpUrl } from "@/lib/ads/config";

describe("ads helpers", () => {
  it("accepts only http(s) destinations", () => {
    expect(isSafeHttpUrl("https://parceiro.example/x")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("/interno")).toBe(false);
  });

  it("builds tracked go urls", () => {
    const url = buildGoUrl({
      to: "https://kiwi.com/u/abc",
      placement: "results_card",
      partner: "kiwi",
    });
    expect(url.startsWith("/api/go?")).toBe(true);
    expect(url).toContain("partner=kiwi");
    expect(url).toContain("placement=results_card");
  });
});
