import { describe, expect, it, beforeEach } from "vitest";
import {
  canCallProvider,
  CIRCUIT_BREAKER_CONFIG,
  getCircuitSnapshot,
  openCircuitForTests,
  recordProviderFailure,
  recordProviderSuccess,
  resetCircuitBreakersForTests,
} from "@/lib/flights/providers/circuit-breaker";

describe("circuit breaker", () => {
  beforeEach(() => {
    resetCircuitBreakersForTests();
  });

  it("stays closed under threshold", () => {
    recordProviderFailure("duffel");
    recordProviderFailure("duffel");
    expect(canCallProvider("duffel")).toBe(true);
    expect(getCircuitSnapshot("duffel").state).toBe("closed");
  });

  it("opens after consecutive failures and blocks calls", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
      recordProviderFailure("kiwi");
    }
    expect(getCircuitSnapshot("kiwi").state).toBe("open");
    expect(canCallProvider("kiwi")).toBe(false);
  });

  it("resets on success", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.failureThreshold; i++) {
      recordProviderFailure("ignav");
    }
    recordProviderSuccess("ignav");
    expect(getCircuitSnapshot("ignav").state).toBe("closed");
    expect(canCallProvider("ignav")).toBe(true);
  });

  it("allows half-open probe after cooldown", () => {
    openCircuitForTests(
      "skiplagged",
      Date.now() - CIRCUIT_BREAKER_CONFIG.openCooldownMs - 10,
    );
    expect(canCallProvider("skiplagged")).toBe(true);
    expect(getCircuitSnapshot("skiplagged").state).toBe("half_open");
  });

  it("re-opens when half-open probe fails", () => {
    openCircuitForTests(
      "seats-aero",
      Date.now() - CIRCUIT_BREAKER_CONFIG.openCooldownMs - 10,
    );
    expect(canCallProvider("seats-aero")).toBe(true);
    recordProviderFailure("seats-aero");
    expect(getCircuitSnapshot("seats-aero").state).toBe("open");
    expect(canCallProvider("seats-aero")).toBe(false);
  });
});
