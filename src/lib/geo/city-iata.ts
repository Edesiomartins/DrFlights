import { normalizeText } from "@/lib/utils/text";

/**
 * Factual city → primary IATA (+ alternates).
 * Brazilian major cities + common international promo destinations.
 * Primary is the busiest/commercial airport typically used in deal feeds.
 */
export type CityAirportMap = {
  primary: string;
  alternates?: string[];
};

/** Keys must be normalizeText()-compatible (no accents, lower case). */
const CITY_TO_IATA: Record<string, CityAirportMap> = {
  // Brasil — SP / RJ / DF / gerais
  "sao paulo": { primary: "GRU", alternates: ["CGH", "VCP"] },
  sp: { primary: "GRU", alternates: ["CGH", "VCP"] },
  guarulhos: { primary: "GRU" },
  campinas: { primary: "VCP" },
  congonhas: { primary: "CGH" },
  "rio de janeiro": { primary: "GIG", alternates: ["SDU"] },
  rio: { primary: "GIG", alternates: ["SDU"] },
  "rio de janeiro rj": { primary: "GIG", alternates: ["SDU"] },
  brasilia: { primary: "BSB" },
  "brasilia df": { primary: "BSB" },
  "belo horizonte": { primary: "CNF", alternates: ["PLU"] },
  "belo horizonte mg": { primary: "CNF" },
  confins: { primary: "CNF" },
  curitiba: { primary: "CWB" },
  "porto alegre": { primary: "POA" },
  "porto alegre rs": { primary: "POA" },
  florianopolis: { primary: "FLN" },
  salvador: { primary: "SSA" },
  recife: { primary: "REC" },
  fortaleza: { primary: "FOR" },
  natal: { primary: "NAT" },
  maceio: { primary: "MCZ" },
  "joao pessoa": { primary: "JPA" },
  "joao pessoa pb": { primary: "JPA" },
  aracaju: { primary: "AJU" },
  manaus: { primary: "MAO" },
  belem: { primary: "BEL" },
  goiania: { primary: "GYN" },
  cuiaba: { primary: "CGB" },
  "campo grande": { primary: "CGR" },
  vitoria: { primary: "VIX" },
  "vitoria es": { primary: "VIX" },
  "sao luis": { primary: "SLZ" },
  teresina: { primary: "THE" },
  "ribeirao preto": { primary: "RAO" },
  niteroi: { primary: "GIG", alternates: ["SDU"] },
  santos: { primary: "CGH", alternates: ["GRU"] },
  "foz do iguacu": { primary: "IGU" },
  iguacu: { primary: "IGU" },
  "fernando de noronha": { primary: "FEN" },
  noronha: { primary: "FEN" },

  // Internacional — Europa / Américas / Oriente Médio
  lisboa: { primary: "LIS" },
  lisbon: { primary: "LIS" },
  porto: { primary: "OPO" },
  "porto portugal": { primary: "OPO" },
  madrid: { primary: "MAD" },
  barcelona: { primary: "BCN" },
  paris: { primary: "CDG", alternates: ["ORY"] },
  londres: { primary: "LHR", alternates: ["LGW", "STN"] },
  london: { primary: "LHR", alternates: ["LGW", "STN"] },
  roma: { primary: "FCO", alternates: ["CIA"] },
  rome: { primary: "FCO", alternates: ["CIA"] },
  milao: { primary: "MXP", alternates: ["LIN"] },
  milan: { primary: "MXP", alternates: ["LIN"] },
  frankfurt: { primary: "FRA" },
  amsterda: { primary: "AMS" },
  amsterdam: { primary: "AMS" },
  miami: { primary: "MIA" },
  "nova york": { primary: "JFK", alternates: ["EWR", "LGA"] },
  "new york": { primary: "JFK", alternates: ["EWR", "LGA"] },
  orlando: { primary: "MCO" },
  "los angeles": { primary: "LAX" },
  boston: { primary: "BOS" },
  chicago: { primary: "ORD", alternates: ["MDW"] },
  toronto: { primary: "YYZ" },
  montreal: { primary: "YUL" },
  "buenos aires": { primary: "EZE", alternates: ["AEP"] },
  santiago: { primary: "SCL" },
  "santiago chile": { primary: "SCL" },
  lima: { primary: "LIM" },
  bogota: { primary: "BOG" },
  "cidade do mexico": { primary: "MEX" },
  "mexico city": { primary: "MEX" },
  panama: { primary: "PTY" },
  "cidade do panama": { primary: "PTY" },
  dubai: { primary: "DXB" },
  doha: { primary: "DOH" },
  istanbul: { primary: "IST" },
  toquio: { primary: "NRT", alternates: ["HND"] },
  tokyo: { primary: "NRT", alternates: ["HND"] },
};

export type ResolvedAirport = {
  primary: string;
  candidates: string[];
  matchedCity?: string;
};

export function resolveCityToIata(rawCity: string): ResolvedAirport | null {
  const key = normalizeText(rawCity);
  if (!key) return null;

  if (/^[a-z]{3}$/.test(key)) {
    const code = key.toUpperCase();
    return { primary: code, candidates: [code] };
  }

  const direct = CITY_TO_IATA[key];
  if (direct) {
    return {
      primary: direct.primary,
      candidates: [direct.primary, ...(direct.alternates ?? [])],
      matchedCity: key,
    };
  }

  // Prefix / includes fallback for phrases like "sao paulo sp"
  for (const [city, map] of Object.entries(CITY_TO_IATA)) {
    if (key.includes(city) || city.includes(key)) {
      return {
        primary: map.primary,
        candidates: [map.primary, ...(map.alternates ?? [])],
        matchedCity: city,
      };
    }
  }

  return null;
}

export function getCityIataDictionarySize(): number {
  return Object.keys(CITY_TO_IATA).length;
}
