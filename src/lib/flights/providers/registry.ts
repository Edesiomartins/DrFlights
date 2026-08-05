import { DuffelProvider } from "@/lib/flights/providers/duffel";
import { IgnavProvider } from "@/lib/flights/providers/ignav";
import { KiwiProvider } from "@/lib/flights/providers/kiwi";
import { SeatsAeroProvider } from "@/lib/flights/providers/seats-aero";
import { SkiplaggedProvider } from "@/lib/flights/providers/skiplagged";
import type { FlightProvider } from "@/lib/flights/types";
import { TravelpayoutsProvider } from "@/lib/flights/providers/travelpayouts";
import { AmadeusProvider } from "@/lib/flights/providers/amadeus";

let providers: FlightProvider[] | null = null;

export function getFlightProviders(): FlightProvider[] {
  if (!providers) {
    providers = [
      new DuffelProvider(),
      new IgnavProvider(),
      new KiwiProvider(),
      new SkiplaggedProvider(),
      new SeatsAeroProvider(),
      new TravelpayoutsProvider(),
      new AmadeusProvider(),
    ];
  }
  return providers;
}

export function getProviderById(id: string): FlightProvider | undefined {
  return getFlightProviders().find((p) => p.id === id);
}
