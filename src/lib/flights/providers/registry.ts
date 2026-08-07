import { IgnavProvider } from "@/lib/flights/providers/ignav";
import { KiwiProvider } from "@/lib/flights/providers/kiwi";
import { SkiplaggedProvider } from "@/lib/flights/providers/skiplagged";
import type { FlightProvider } from "@/lib/flights/types";
import { TravelpayoutsProvider } from "@/lib/flights/providers/travelpayouts";

/** Providers ativos no metabuscador (sem chaves não usadas). */
export const ACTIVE_PROVIDER_IDS = [
  "ignav",
  "kiwi",
  "skiplagged",
  "travelpayouts",
] as const;

export type ActiveProviderId = (typeof ACTIVE_PROVIDER_IDS)[number];

let providers: FlightProvider[] | null = null;

export function getFlightProviders(): FlightProvider[] {
  if (!providers) {
    providers = [
      new IgnavProvider(),
      new KiwiProvider(),
      new SkiplaggedProvider(),
      new TravelpayoutsProvider(),
    ];
  }
  return providers;
}

export function getProviderById(id: string): FlightProvider | undefined {
  return getFlightProviders().find((p) => p.id === id);
}

export function isActiveProviderId(id: string): boolean {
  return (ACTIVE_PROVIDER_IDS as readonly string[]).includes(id);
}
