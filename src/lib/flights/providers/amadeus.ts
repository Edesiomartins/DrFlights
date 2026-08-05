import { BaseFlightProvider } from "@/lib/flights/providers/base";
import { normalizeAmadeusPayload } from "@/lib/flights/normalization/amadeus";
import type { FlightSearchInput, NormalizedFlightOffer, ProviderHealthResult } from "@/lib/flights/types";
import { getAmadeusBaseUrl, getAmadeusClientId, getAmadeusClientSecret } from "@/lib/utils/env";

let tokenCache: { value: string; expiresAt: number } | null = null; let tokenPromise: Promise<string> | null = null;
async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => { const body = new URLSearchParams({ grant_type: "client_credentials", client_id: getAmadeusClientId() ?? "", client_secret: getAmadeusClientSecret() ?? "" }); const res = await fetch(`${getAmadeusBaseUrl()}/v1/security/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }); if (!res.ok) throw new Error(`Amadeus auth HTTP ${res.status}`); const json = await res.json() as { access_token: string; expires_in?: number }; tokenCache = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000 }; return json.access_token; })();
  try { return await tokenPromise; } finally { tokenPromise = null; }
}
export class AmadeusProvider extends BaseFlightProvider {
  readonly id="amadeus"; readonly name="Amadeus Self-Service";
  get configured() { return Boolean(getAmadeusClientId() && getAmadeusClientSecret()); }
  protected async executeSearch(input: FlightSearchInput, signal: AbortSignal): Promise<NormalizedFlightOffer[]> { if (input.tripType === "multi_city") return []; const first=input.slices[0]; if(!first)return[]; const params=new URLSearchParams({ originLocationCode:first.origin,destinationLocationCode:first.destination,departureDate:first.departureDate,adults:String(input.adults),children:String(input.children),infants:String(input.infants),travelClass:input.cabin.toUpperCase(),currencyCode:"BRL",max:"20" }); if(input.tripType==="round_trip"&&input.slices[1])params.set("returnDate",input.slices[1].departureDate); if(input.maxStops===0)params.set("nonStop","true"); const res=await fetch(`${getAmadeusBaseUrl()}/v2/shopping/flight-offers?${params}`,{signal,headers:{Authorization:`Bearer ${await accessToken()}`}}); if(!res.ok)throw new Error(`Amadeus HTTP ${res.status}: ${(await res.text()).slice(0,160)}`); return normalizeAmadeusPayload(await res.json()); }
  async healthCheck(): Promise<ProviderHealthResult> { return {provider:this.id,configured:this.configured,enabled:this.enabled,ok:this.configured,message:this.configured?"Amadeus configurado.":"AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET ausentes."}; }
}
