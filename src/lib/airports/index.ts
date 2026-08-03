import { readFileSync } from "fs";
import path from "path";
import { fuzzyIncludes, normalizeText } from "@/lib/utils/text";

export type AirportRecord = {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

type AirportFile = {
  _meta?: {
    source?: string;
    license?: string;
  };
  airports: Record<
    string,
    { name: string; city: string; country: string; lat: number; lon: number }
  >;
};

type IndexedAirport = AirportRecord & {
  iataN: string;
  nameN: string;
  cityN: string;
  countryN: string;
};

/** Common Brazilian / PT query aliases → normalized tokens to boost. */
const QUERY_ALIASES: Record<string, string[]> = {
  guarulhos: ["guarulhos", "gru"],
  guarulhus: ["guarulhos", "gru"],
  "sao paulo": ["sao paulo", "gru", "cgh", "vcp"],
  "sao paulo sp": ["sao paulo"],
  sp: ["sao paulo", "gru", "cgh"],
  goiania: ["goiania", "gyn"],
  "rio de janeiro": ["rio de janeiro", "gig", "sdu"],
  rio: ["rio de janeiro", "gig", "sdu"],
  bsb: ["brasilia", "bsb"],
  brasilia: ["brasilia", "bsb"],
};

let cache: IndexedAirport[] | null = null;
let meta: AirportFile["_meta"] | null = null;

function loadAirports(): IndexedAirport[] {
  if (cache) return cache;
  const full = path.join(process.cwd(), "data", "airport-coordinates.json");
  const parsed = JSON.parse(readFileSync(full, "utf8")) as AirportFile;
  meta = parsed._meta ?? null;
  cache = Object.entries(parsed.airports).map(([iata, info]) => ({
    iata,
    name: info.name,
    city: info.city,
    country: info.country,
    lat: info.lat,
    lon: info.lon,
    iataN: normalizeText(iata),
    nameN: normalizeText(info.name),
    cityN: normalizeText(info.city),
    countryN: normalizeText(info.country),
  }));
  return cache;
}

export function getAirportAttribution(): string {
  loadAirports();
  return `Dados de aeroportos derivados de OpenFlights (https://openflights.org/data.php), licença ${meta?.license ?? "ODbL"}.`;
}

function expandQuery(q: string): string[] {
  const base = normalizeText(q);
  if (!base) return [];
  const aliases = QUERY_ALIASES[base] ?? [];
  return Array.from(new Set([base, ...aliases.map(normalizeText)]));
}

function scoreAirport(airport: IndexedAirport, rawQuery: string): number {
  const variants = expandQuery(rawQuery);
  if (variants.length === 0) return 0;

  let best = 0;
  for (const query of variants) {
    let score = 0;
    const { iataN, nameN, cityN, countryN } = airport;

    // IATA: exact/prefix only (edit-distance on 3-letter codes is too noisy)
    if (iataN === query) score += 200;
    else if (query.length >= 2 && query.length <= 3 && iataN.startsWith(query)) {
      score += 110;
    }

    if (cityN === query) score += 85;
    else if (cityN.startsWith(query)) score += 65;
    else if (cityN.includes(query)) score += 45;
    else if (query.length >= 4 && fuzzyIncludes(cityN, query, 2)) score += 40;

    if (nameN === query) score += 70;
    else if (nameN.startsWith(query)) score += 50;
    else if (nameN.includes(query)) score += 30;
    else if (query.length >= 5 && fuzzyIncludes(nameN, query, 2)) score += 28;

    if (countryN.includes(query) && query.length >= 4) score += 8;

    // Multi-token: "sao paulo" against city
    if (query.includes(" ") && cityN.includes(query)) score += 20;

    if (airport.country === "Brazil") score += 15;

    if (score > best) best = score;
  }

  return best;
}

export function searchAirports(query: string, limit = 8): AirportRecord[] {
  const q = query.trim();
  if (q.length < 1) return [];
  const airports = loadAirports();
  return airports
    .map((airport) => ({ airport, score: scoreAirport(airport, q) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.airport.city.localeCompare(b.airport.city),
    )
    .slice(0, limit)
    .map(({ airport }) => ({
      iata: airport.iata,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      lat: airport.lat,
      lon: airport.lon,
    }));
}

export function getAirportByIata(iata: string): AirportRecord | undefined {
  const code = iata.trim().toUpperCase();
  const found = loadAirports().find((a) => a.iata === code);
  if (!found) return undefined;
  return {
    iata: found.iata,
    name: found.name,
    city: found.city,
    country: found.country,
    lat: found.lat,
    lon: found.lon,
  };
}
