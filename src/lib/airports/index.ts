import { readFileSync } from "fs";
import path from "path";

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

let cache: AirportRecord[] | null = null;
let meta: AirportFile["_meta"] | null = null;

function loadAirports(): AirportRecord[] {
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
  }));
  return cache;
}

export function getAirportAttribution(): string {
  loadAirports();
  return `Dados de aeroportos derivados de OpenFlights (https://openflights.org/data.php), licença ${meta?.license ?? "ODbL"}.`;
}

function scoreAirport(airport: AirportRecord, q: string): number {
  const query = q.toLowerCase();
  const iata = airport.iata.toLowerCase();
  const name = airport.name.toLowerCase();
  const city = airport.city.toLowerCase();
  const country = airport.country.toLowerCase();

  let score = 0;
  if (iata === query) score += 100;
  else if (iata.startsWith(query)) score += 80;
  if (city === query) score += 70;
  else if (city.startsWith(query)) score += 50;
  else if (city.includes(query)) score += 30;
  if (name.startsWith(query)) score += 40;
  else if (name.includes(query)) score += 20;
  if (country.includes(query)) score += 10;

  // Prefer Brazilian airports when UI is pt-BR and query is ambiguous
  if (airport.country === "Brazil") score += 15;

  return score;
}

export function searchAirports(query: string, limit = 8): AirportRecord[] {
  const q = query.trim();
  if (q.length < 1) return [];
  const airports = loadAirports();
  return airports
    .map((airport) => ({ airport, score: scoreAirport(airport, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.airport.city.localeCompare(b.airport.city))
    .slice(0, limit)
    .map((x) => x.airport);
}

export function getAirportByIata(iata: string): AirportRecord | undefined {
  const code = iata.trim().toUpperCase();
  return loadAirports().find((a) => a.iata === code);
}
