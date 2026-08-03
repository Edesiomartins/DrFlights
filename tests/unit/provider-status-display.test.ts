import { describe, expect, it } from "vitest";
import {
  classifyProviderStatus,
  formatHealthResultLine,
  nextCircuitRetryAt,
  summarizeProviderStatuses,
} from "@/lib/admin/provider-status-display";
import { CIRCUIT_BREAKER_CONFIG } from "@/lib/flights/providers/circuit-breaker";

describe("provider status display", () => {
  it("maps unconfigured/disabled without treating as failure", () => {
    const view = classifyProviderStatus({
      enabled: false,
      lastStatus: "disabled",
      circuitState: "closed",
    });
    expect(view.category).toBe("unconfigured");
    expect(view.label).toBe("Não configurado");
    expect(view.tone).toBe("neutral");
  });

  it("maps operational providers", () => {
    const view = classifyProviderStatus({
      enabled: true,
      lastStatus: "success",
      circuitState: "closed",
    });
    expect(view.category).toBe("operational");
    expect(view.label).toBe("Operacional");
    expect(view.tone).toBe("ok");
  });

  it("maps failed configured providers", () => {
    const view = classifyProviderStatus({
      enabled: true,
      lastStatus: "error",
      circuitState: "closed",
    });
    expect(view.category).toBe("failed");
    expect(view.label).toBe("Com falha");
    expect(view.tone).toBe("danger");
  });

  it("maps open circuit as paused", () => {
    const view = classifyProviderStatus({
      enabled: true,
      lastStatus: "error",
      circuitState: "open",
    });
    expect(view.category).toBe("paused");
    expect(view.label).toBe("Pausado temporariamente");
    expect(view.tone).toBe("warn");
  });

  it("summarizes categories separately", () => {
    const summary = summarizeProviderStatuses([
      {
        provider: "a",
        enabled: true,
        lastStatus: "success",
        lastLatencyMs: 10,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: null,
        circuitState: "closed",
      },
      {
        provider: "b",
        enabled: false,
        lastStatus: "disabled",
        lastLatencyMs: null,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: "sem chave",
        circuitState: "closed",
      },
      {
        provider: "c",
        enabled: true,
        lastStatus: "error",
        lastLatencyMs: 20,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: "timeout",
        circuitState: "closed",
      },
      {
        provider: "d",
        enabled: true,
        lastStatus: "error",
        lastLatencyMs: 20,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: "timeout",
        circuitState: "open",
      },
    ]);
    expect(summary).toEqual({
      operational: 1,
      unconfigured: 1,
      failed: 1,
      paused: 1,
    });
  });

  it("treats missing-key error rows as unconfigured even with lastStatus=error", () => {
    const view = classifyProviderStatus({
      enabled: false,
      lastStatus: "error",
      circuitState: "closed",
      lastError: "DUFFEL_API_KEY / DUFFEL_API_KEY_LIVE não configurada.",
    });
    expect(view.category).toBe("unconfigured");
    expect(view.tone).toBe("neutral");
  });

  it("formats health lines without calling unconfigured a failure", () => {
    expect(
      formatHealthResultLine({
        provider: "duffel",
        configured: false,
        ok: false,
        message: "chave ausente",
      }),
    ).toContain("não configurado");
    expect(
      formatHealthResultLine({
        provider: "duffel",
        configured: false,
        ok: false,
        message: "DUFFEL_API_KEY / DUFFEL_API_KEY_LIVE não configurada.",
      }),
    ).not.toContain("com falha");
  });

  it("computes next circuit retry from openedAt", () => {
    const opened = new Date("2026-08-03T12:00:00.000Z");
    const next = nextCircuitRetryAt(opened);
    expect(next?.getTime()).toBe(
      opened.getTime() + CIRCUIT_BREAKER_CONFIG.openCooldownMs,
    );
  });
});
