import { describe, expect, it, vi } from "vitest";

describe("logger sanitize", () => {
  it("redacts secrets and emails in meta", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { logger } = await import("@/lib/utils/logger");
    logger.info("test.event", {
      password: "super-secret",
      token: "abc",
      note: "user@example.com called with Bearer xyz.token.value",
    });

    const line = String(logSpy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("[REDACTED]");
    expect(line).toContain("[REDACTED_EMAIL]");
    expect(line).not.toContain("super-secret");
    expect(line).not.toContain("user@example.com");

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
