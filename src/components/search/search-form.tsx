"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AirportInput } from "@/components/search/airport-input";

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
  const [extraSlices, setExtraSlices] = useState<
    Array<{ origin: string; destination: string; departureDate: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

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
    <form className="glass animate-rise" onSubmit={onSubmit} style={{ borderRadius: "1.5rem", padding: "1.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {(
          [
            ["round_trip", "Ida e volta"],
            ["one_way", "Somente ida"],
            ["multi_city", "Múltiplos trechos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn ${tripType === value ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTripType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <AirportInput id="origin" label="Origem" value={origin} onChange={setOrigin} />
        <AirportInput
          id="destination"
          label="Destino"
          value={destination}
          onChange={setDestination}
        />
        <div className="field">
          <label htmlFor="depart">Data de ida</label>
          <input id="depart" type="date" required value={depart} onChange={(e) => setDepart(e.target.value)} />
        </div>
        {tripType === "round_trip" ? (
          <div className="field">
            <label htmlFor="return">Data de volta</label>
            <input id="return" type="date" required value={ret} onChange={(e) => setRet(e.target.value)} />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="adults">Adultos</label>
          <input
            id="adults"
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="children">Crianças</label>
          <input
            id="children"
            type="number"
            min={0}
            max={8}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="infants">Bebês</label>
          <input
            id="infants"
            type="number"
            min={0}
            max={4}
            value={infants}
            onChange={(e) => setInfants(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="cabin">Cabine</label>
          <select id="cabin" value={cabin} onChange={(e) => setCabin(e.target.value)}>
            <option value="economy">Econômica</option>
            <option value="premium_economy">Econômica premium</option>
            <option value="business">Executiva</option>
            <option value="first">Primeira</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="stops">Máx. escalas</label>
          <select id="stops" value={maxStops} onChange={(e) => setMaxStops(e.target.value)}>
            <option value="">Qualquer</option>
            <option value="0">Direto</option>
            <option value="1">Até 1</option>
            <option value="2">Até 2</option>
          </select>
        </div>
      </div>

      {tripType === "multi_city" ? (
        <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          {extraSlices.map((slice, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
              }}
            >
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
        <label style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={compareSeparate}
            onChange={(e) => setCompareSeparate(e.target.checked)}
          />
          Comparar ida e volta com dois trechos separados
        </label>
      ) : null}

      {error ? <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p> : null}

      <div style={{ marginTop: "1.25rem" }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Preparando busca…" : "Buscar passagens"}
        </button>
      </div>
    </form>
  );
}
