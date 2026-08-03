"use client";

import { useEffect, useRef, useState } from "react";

type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
};

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (iata: string) => void;
};

export function AirportInput({ id, label, value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/airports?q=${encodeURIComponent(query)}&limit=8`);
      if (!res.ok) return;
      const data = (await res.json()) as { airports: Airport[] };
      setOptions(data.airports);
      setOpen(true);
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="field" ref={boxRef} style={{ position: "relative" }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={query}
        autoComplete="off"
        placeholder="Cidade ou IATA"
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.length === 3) onChange(e.target.value.toUpperCase());
        }}
        onFocus={() => options.length > 0 && setOpen(true)}
      />
      {open && options.length > 0 ? (
        <ul
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            margin: "0.25rem 0 0",
            padding: 0,
            listStyle: "none",
            background: "#fff",
            border: "1px solid rgba(16,32,51,0.12)",
            borderRadius: "0.85rem",
            maxHeight: 240,
            overflow: "auto",
            boxShadow: "var(--shadow)",
          }}
        >
          {options.map((airport) => (
            <li key={airport.iata}>
              <button
                type="button"
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.7rem 0.85rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onClick={() => {
                  onChange(airport.iata);
                  setQuery(`${airport.city} (${airport.iata})`);
                  setOpen(false);
                }}
              >
                <strong>{airport.iata}</strong> · {airport.city} — {airport.name}
                <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{airport.country}</div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
