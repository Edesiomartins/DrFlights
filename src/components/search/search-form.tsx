"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AirportInput } from "@/components/search/airport-input";
import {
  futureDepartDate,
  PREFILL_SEARCH_EVENT,
  type PrefillSearchDetail,
} from "@/lib/deals/format";

type TripType = "one_way" | "round_trip" | "multi_city";

export function SearchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tripType, setTripType] = useState<TripType>("round_trip");
  const [origin, setOrigin] = useState("GRU");
  const [destination, setDestination] = useState("GIG");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabin, setCabin] = useState("economy");
  const [maxStops, setMaxStops] = useState<string>("");
  const [compareSeparate, setCompareSeparate] = useState(false);
  const [passengersOpen, setPassengersOpen] = useState(false);
  const [extraSlices, setExtraSlices] = useState<
    Array<{ origin: string; destination: string; departureDate: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<PrefillSearchDetail>).detail;
      if (!detail?.origin || !detail?.destination) return;
      const nextOrigin = detail.origin.toUpperCase();
      const nextDestination = detail.destination.toUpperCase();
      const nextDepart = depart || futureDepartDate(21);
      setOrigin(nextOrigin);
      setDestination(nextDestination);
      setTripType("one_way");
      setRet("");
      if (!depart) setDepart(nextDepart);
      setError(null);

      const form = document.querySelector<HTMLElement>(
        "[data-testid='search-form']",
      );
      form?.scrollIntoView({ behavior: "smooth", block: "center" });

      if (detail.runSearch) {
        const payload = {
          tripType: "one_way" as const,
          slices: [
            {
              origin: nextOrigin,
              destination: nextDestination,
              departureDate: nextDepart,
            },
          ],
          adults,
          children,
          infants,
          cabin,
          maxStops: maxStops === "" ? undefined : Number(maxStops),
          compareSeparateLegs: false,
        };
        startTransition(() => {
          const params = new URLSearchParams({ q: JSON.stringify(payload) });
          router.push(`/resultados?${params.toString()}`);
        });
      }
    }

    window.addEventListener(PREFILL_SEARCH_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_SEARCH_EVENT, onPrefill);
  }, [adults, cabin, children, depart, infants, maxStops, router]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!origin || !destination) {
      setError("Selecione origem e destino.");
      return;
    }
    if (!depart) {
      setError("Informe a data de ida.");
      return;
    }
    if (tripType === "round_trip" && !ret) {
      setError("Informe a data de volta.");
      return;
    }

    const slices =
      tripType === "multi_city"
        ? [
            { origin, destination, departureDate: depart },
            ...extraSlices.filter((s) => s.origin && s.destination && s.departureDate),
          ]
        : tripType === "round_trip"
          ? [
              { origin, destination, departureDate: depart },
              { origin: destination, destination: origin, departureDate: ret },
            ]
          : [{ origin, destination, departureDate: depart }];

    const payload = {
      tripType,
      slices,
      adults,
      children,
      infants,
      cabin,
      maxStops: maxStops === "" ? undefined : Number(maxStops),
      compareSeparateLegs: tripType === "round_trip" ? compareSeparate : false,
    };

    startTransition(() => {
      const params = new URLSearchParams({ q: JSON.stringify(payload) });
      router.push(`/resultados?${params.toString()}`);
    });
  }

  return (
    <form
      className="glass search-form search-form--hero"
      onSubmit={onSubmit}
      data-testid="search-form"
      tabIndex={-1}
    >
      <div className="trip-type-row" role="group" aria-label="Tipo de viagem">
        {(
          [
            ["round_trip", "Ida e volta"],
            ["one_way", "Somente ida"],
            ["multi_city", "Trechos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`trip-type-btn ${tripType === value ? "is-active" : ""}`}
            onClick={() => setTripType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="search-rows">
        <div className="search-row search-row--route">
          <AirportInput id="origin" label="Origem" value={origin} onChange={setOrigin} />
          <button
            type="button"
            className="route-swap"
            aria-label="Inverter origem e destino"
            onClick={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden><path d="m7 7 3-3m-3 3 3 3M7 7h10M17 17l-3-3m3 3-3 3m3-3H7" /></svg>
          </button>
          <AirportInput
            id="destination"
            label="Destino"
            value={destination}
            onChange={setDestination}
          />
        </div>

        <div
          className={`search-row search-row--dates ${tripType === "round_trip" ? "has-return" : ""}`}
        >
          <div className="field">
            <label htmlFor="depart">Data de ida</label>
            <input
              id="depart"
              type="date"
              required
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
            />
          </div>
          {tripType === "round_trip" ? (
            <div className="field">
              <label htmlFor="return">Data de volta</label>
              <input
                id="return"
                type="date"
                required
                value={ret}
                onChange={(e) => setRet(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="passengers-control">
          <span className="field-label">Viajantes e cabine</span>
          <button type="button" className="passengers-trigger" aria-expanded={passengersOpen} onClick={() => setPassengersOpen((value) => !value)}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span>{adults} {adults === 1 ? "adulto" : "adultos"}{children ? `, ${children} criança${children > 1 ? "s" : ""}` : ""}{infants ? `, ${infants} bebê${infants > 1 ? "s" : ""}` : ""} · {cabin === "economy" ? "Econômica" : cabin === "premium_economy" ? "Econômica premium" : cabin === "business" ? "Executiva" : "Primeira"}</span>
            <span aria-hidden>⌄</span>
          </button>
          {passengersOpen ? (
            <div className="passengers-popover">
              <div className="passenger-fields">
                <div className="field"><label htmlFor="adults">Adultos</label><input id="adults" type="number" min={1} max={9} value={adults} onChange={(e) => setAdults(Number(e.target.value))} /></div>
                <div className="field"><label htmlFor="children">Crianças</label><input id="children" type="number" min={0} max={8} value={children} onChange={(e) => setChildren(Number(e.target.value))} /></div>
                <div className="field"><label htmlFor="infants">Bebês</label><input id="infants" type="number" min={0} max={4} value={infants} onChange={(e) => setInfants(Number(e.target.value))} /></div>
              </div>
              <div className="passenger-options">
                <div className="field"><label htmlFor="cabin">Cabine</label><select id="cabin" value={cabin} onChange={(e) => setCabin(e.target.value)}><option value="economy">Econômica</option><option value="premium_economy">Econômica premium</option><option value="business">Executiva</option><option value="first">Primeira</option></select></div>
                <div className="field"><label htmlFor="stops">Máx. escalas</label><select id="stops" value={maxStops} onChange={(e) => setMaxStops(e.target.value)}><option value="">Qualquer</option><option value="0">Direto</option><option value="1">Até 1</option><option value="2">Até 2</option></select></div>
              </div>
              <button type="button" className="btn btn-secondary passengers-done" onClick={() => setPassengersOpen(false)}>Concluir</button>
            </div>
          ) : null}
        </div>
      </div>

      {tripType === "multi_city" ? (
        <div className="multi-city-block">
          {extraSlices.map((slice, index) => (
            <div key={index} className="search-row search-row--route">
              <div className="field">
                <label>Origem {index + 2}</label>
                <input
                  value={slice.origin}
                  onChange={(e) => {
                    const next = [...extraSlices];
                    next[index] = { ...slice, origin: e.target.value.toUpperCase() };
                    setExtraSlices(next);
                  }}
                />
              </div>
              <div className="field">
                <label>Destino {index + 2}</label>
                <input
                  value={slice.destination}
                  onChange={(e) => {
                    const next = [...extraSlices];
                    next[index] = { ...slice, destination: e.target.value.toUpperCase() };
                    setExtraSlices(next);
                  }}
                />
              </div>
              <div className="field">
                <label>Data</label>
                <input
                  type="date"
                  value={slice.departureDate}
                  onChange={(e) => {
                    const next = [...extraSlices];
                    next[index] = { ...slice, departureDate: e.target.value };
                    setExtraSlices(next);
                  }}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setExtraSlices((prev) => [
                ...prev,
                { origin: "", destination: "", departureDate: "" },
              ])
            }
          >
            Adicionar trecho
          </button>
        </div>
      ) : null}

      {tripType === "round_trip" ? (
        <label className="checkbox-field compare-legs">
          <input
            type="checkbox"
            checked={compareSeparate}
            onChange={(e) => setCompareSeparate(e.target.checked)}
          />
          <span className="toggle-track" aria-hidden><span /></span>
          Comparar com trechos separados
        </label>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="search-submit">
        <button
          className="btn btn-primary search-submit-btn"
          type="submit"
          disabled={pending}
          data-testid="search-submit"
        >
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          {pending ? "Preparando busca…" : "Buscar voos"}
        </button>
      </div>
    </form>
  );
}
