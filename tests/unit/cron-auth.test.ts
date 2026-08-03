import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/alerts/runner", () => ({
  runPriceAlerts: vi.fn(async () => ({
    checked: 0,
    notified: 0,
    skippedSmtp: true,
    errors: 0,
  })),
}));

describe("POST /api/cron/alerts auth", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects missing bearer", async () => {
    const { POST } = await import("@/app/api/cron/alerts/route");
    const res = await POST(new Request("http://localhost/api/cron/alerts", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("accepts valid bearer", async () => {
    const { POST } = await import("@/app/api/cron/alerts/route");
    const res = await POST(
      new Request("http://localhost/api/cron/alerts", {
        method: "POST",
        headers: { Authorization: "Bearer test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
