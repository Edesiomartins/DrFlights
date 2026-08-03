"use client";

import { FormEvent, useEffect, useState } from "react";

type Alert = {
  id: string;
  origin: string;
  destination: string;
  departureDateFrom: string;
  departureDateTo: string;
  returnDateFrom: string | null;
  maxPrice: number | null;
  currency: string;
  cabin: string;
  active: boolean;
  lastMatchedPrice: number | null;
  lastCheckedAt: string | null;
};

export function AlertsClient() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [smtpNote, setSmtpNote] = useState<string | null>(null);

  async function load() {
    const [alertsRes, healthRes] = await Promise.all([
      fetch("/api/alerts"),
      fetch("/api/health"),
    ]);
    if (!alertsRes.ok) {
      setError("Não foi possível carregar os alertas.");
      return;
    }
    const data = (await alertsRes.json()) as { alerts: Alert[] };
    setAlerts(data.alerts);
    if (healthRes.ok) {
      const health = (await healthRes.json()) as { smtpConfigured?: boolean };
      if (!health.smtpConfigured) {
        setSmtpNote("SMTP não configurado: a criação de alertas funciona, mas o envio de e-mail está desativado.");
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      origin: String(form.get("origin")).toUpperCase(),
      destination: String(form.get("destination")).toUpperCase(),
      departureDateFrom: String(form.get("departureDateFrom")),
      departureDateTo: String(form.get("departureDateTo")),
      returnDateFrom: String(form.get("returnDateFrom") || "") || null,
      cabin: String(form.get("cabin")),
      adults: Number(form.get("adults") || 1),
      children: Number(form.get("children") || 0),
      maxPrice: Number(form.get("maxPrice")),
      currency: String(form.get("currency") || "BRL"),
      maxStops:
        form.get("maxStops") === "" ? null : Number(form.get("maxStops")),
      active: true,
    };

    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Falha ao criar alerta.");
      return;
    }
    event.currentTarget.reset();
    await load();
  }

  async function toggle(alert: Alert) {
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !alert.active }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {smtpNote ? (
        <div className="glass" style={{ padding: "1rem", borderRadius: "1rem", color: "var(--warn)" }}>
          {smtpNote}
        </div>
      ) : null}

      <form
        className="glass"
        onSubmit={onCreate}
        style={{
          borderRadius: "1.25rem",
          padding: "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.85rem",
        }}
      >
        <div className="field">
          <label>Origem</label>
          <input name="origin" required maxLength={3} placeholder="GRU" />
        </div>
        <div className="field">
          <label>Destino</label>
          <input name="destination" required maxLength={3} placeholder="GIG" />
        </div>
        <div className="field">
          <label>Ida de</label>
          <input name="departureDateFrom" type="date" required />
        </div>
        <div className="field">
          <label>Ida até</label>
          <input name="departureDateTo" type="date" required />
        </div>
        <div className="field">
          <label>Volta (opc.)</label>
          <input name="returnDateFrom" type="date" />
        </div>
        <div className="field">
          <label>Preço máx.</label>
          <input name="maxPrice" type="number" step="0.01" required />
        </div>
        <div className="field">
          <label>Moeda</label>
          <input name="currency" defaultValue="BRL" />
        </div>
        <div className="field">
          <label>Cabine</label>
          <select name="cabin" defaultValue="economy">
            <option value="economy">Econômica</option>
            <option value="premium_economy">Premium</option>
            <option value="business">Executiva</option>
            <option value="first">Primeira</option>
          </select>
        </div>
        <div className="field">
          <label>Adultos</label>
          <input name="adults" type="number" defaultValue={1} min={1} />
        </div>
        <div className="field">
          <label>Crianças</label>
          <input name="children" type="number" defaultValue={0} min={0} />
        </div>
        <div className="field">
          <label>Máx. escalas</label>
          <input name="maxStops" type="number" min={0} max={3} />
        </div>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button className="btn btn-primary" type="submit">
            Criar alerta
          </button>
        </div>
      </form>

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      <section style={{ display: "grid", gap: "0.85rem" }}>
        {alerts.length === 0 ? (
          <div className="glass" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
            Nenhum alerta ainda.
          </div>
        ) : (
          alerts.map((alert) => (
            <article
              key={alert.id}
              className="glass"
              style={{
                borderRadius: "1rem",
                padding: "1rem 1.1rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>
                  {alert.origin} → {alert.destination}
                </strong>
                <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                  {alert.departureDateFrom} → {alert.departureDateTo}
                  {alert.returnDateFrom ? ` · volta ${alert.returnDateFrom}` : ""}
                  {" · "}
                  limite {alert.currency} {alert.maxPrice}
                  {" · "}
                  {alert.active ? "ativo" : "inativo"}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  Último preço: {alert.lastMatchedPrice ?? "—"} · última checagem:{" "}
                  {alert.lastCheckedAt
                    ? new Date(alert.lastCheckedAt).toLocaleString("pt-BR")
                    : "nunca"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-secondary" type="button" onClick={() => void toggle(alert)}>
                  {alert.active ? "Desativar" : "Ativar"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => void remove(alert.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
