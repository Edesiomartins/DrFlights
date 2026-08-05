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
  const [loading, setLoading] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    setUserEdited(false);
  }, [value]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!userEdited || query.trim().length < 1) {
      setOptions([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/airports?q=${encodeURIComponent(query)}&limit=8`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { airports: Airport[] };
        setOptions(data.airports);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, userEdited]);

  return (
    <div className="field airport-field" ref={boxRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={query}
        autoComplete="off"
        inputMode="search"
        enterKeyHint="search"
        placeholder="Cidade, aeroporto ou IATA"
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        onChange={(e) => {
          setUserEdited(true);
          setQuery(e.target.value);
          if (e.target.value.length === 3) onChange(e.target.value.toUpperCase());
        }}
        onFocus={() => {
          if (userEdited && options.length > 0) setOpen(true);
        }}
      />
      {loading ? (
        <span className="airport-loading" aria-hidden>
          …
        </span>
      ) : null}
      {open && options.length > 0 ? (
        <ul
          id={`${id}-listbox`}
          className="airport-dropdown"
          data-testid={`${id}-airport-list`}
        >
          {options.map((airport) => (
            <li key={airport.iata}>
              <button
                type="button"
                onClick={() => {
                  onChange(airport.iata);
                  setQuery(`${airport.city} (${airport.iata})`);
                  setOpen(false);
                }}
              >
                <strong>{airport.iata}</strong> · {airport.city} — {airport.name}
                <div className="airport-country">{airport.country}</div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
