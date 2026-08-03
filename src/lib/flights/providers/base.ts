import type {
  FlightProvider,
  FlightSearchInput,
  ProviderHealthResult,
  ProviderSearchResult,
} from "@/lib/flights/types";
import { getProviderTimeoutMs } from "@/lib/utils/env";

export abstract class BaseFlightProvider implements FlightProvider {
  abstract readonly id: string;
  abstract readonly name: string;

  abstract get configured(): boolean;

  get enabled(): boolean {
    return this.configured;
  }

  protected get timeoutMs(): number {
    return getProviderTimeoutMs();
  }

  async search(input: FlightSearchInput): Promise<ProviderSearchResult> {
    const started = Date.now();
    if (!this.enabled) {
      return {
        provider: this.id,
        status: "disabled",
        offers: [],
        durationMs: Date.now() - started,
        error: {
          code: "PROVIDER_DISABLED",
          message: `${this.name} não está configurado (chave ausente).`,
          retryable: false,
        },
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const offers = await this.executeSearch(input, controller.signal);
      return {
        provider: this.id,
        status: offers.length > 0 ? "success" : "success",
        offers,
        durationMs: Date.now() - started,
        error:
          offers.length === 0
            ? {
                code: "NO_RESULTS",
                message: "Nenhuma oferta encontrada nesta fonte.",
                retryable: false,
              }
            : undefined,
      };
    } catch (error) {
      return this.mapError(error, started);
    } finally {
      clearTimeout(timer);
    }
  }

  protected abstract executeSearch(
    input: FlightSearchInput,
    signal: AbortSignal,
  ): Promise<ProviderSearchResult["offers"]>;

  abstract healthCheck(): Promise<ProviderHealthResult>;

  protected mapError(error: unknown, started: number): ProviderSearchResult {
    const durationMs = Date.now() - started;
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || (error instanceof Error && /aborted/i.test(error.message))) {
      return {
        provider: this.id,
        status: "error",
        offers: [],
        durationMs,
        error: {
          code: "TIMEOUT",
          message: `Tempo limite (${this.timeoutMs}ms) excedido.`,
          retryable: true,
        },
      };
    }

    const message =
      error instanceof Error ? error.message : "Erro desconhecido no provider";
    const lower = message.toLowerCase();
    let code = "PROVIDER_ERROR";
    let retryable = true;

    if (lower.includes("401") || lower.includes("403") || lower.includes("auth")) {
      code = "AUTH_ERROR";
      retryable = false;
    } else if (lower.includes("429") || lower.includes("rate")) {
      code = "RATE_LIMIT";
      retryable = true;
    }

    return {
      provider: this.id,
      status: "error",
      offers: [],
      durationMs,
      error: { code, message, retryable },
    };
  }
}
