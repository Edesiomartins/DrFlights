"use client";

import { FormEvent, useEffect, useState } from "react";
import { TelegramLinkCard } from "@/components/alerts/telegram-link-card";
import { PushEnableCard } from "@/components/alerts/push-enable-card";

type Alert = {
  id: string;
  origin: string;
  destination: string;
  anyDestination?: boolean;
  departureDateFrom: string;
  departureDateTo: string;
  returnDateFrom: string | null;
  maxPrice: number | null;
  currency: string;
  cabin: string;
  promoOnly?: boolean;
  active: boolean;
  lastMatchedPrice: number | null;
  lastCheckedAt: string | null;
};

export function AlertsClient() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [smtpNote, setSmtpNote] = useState<string | null>(null);
  const [anyDestination, setAnyDestination] = useState(false);
  const [promoOnly, setPromoOnly] = useState(false);

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
        setSmtpNote(
          "SMTP não configurado: a criação de alertas funciona, mas o envio de e-mail está desativado. Use Telegram ou Web Push se configurados.",
        );
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const destRaw = String(form.get("destination") || "").toUpperCase();
    const payload = {
      origin: String(form.get("origin")).toUpperCase(),
      destination: anyDestination ? "ANY" : destRaw,
      anyDestination,
      departureDateFrom: String(form.get("departureDateFrom")),
      departureDateTo: String(form.get("departureDateTo")),
      returnDateFrom: String(form.get("returnDateFrom") || "") || null,
      cabin: String(form.get("cabin")),
      adults: Number(form.get("adults") || 1),
      children: Number(form.get("children") || 0),
      maxPrice: form.get("maxPrice")
        ? Number(form.get("maxPrice"))
        : null,
      currency: String(form.get("currency") || "BRL"),
      maxStops:
        form.get("maxStops") === "" ? null : Number(form.get("maxStops")),
      promoOnly,
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
    formEl.reset();
    setAnyDestination(false);
    setPromoOnly(false);
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
    <div className="alerts-layout">
      {smtpNote ? (
        <div className="glass notice-card notice-warn">{smtpNote}</div>
      ) : null}

      <TelegramLinkCard />
      <PushEnableCard />

      <form
        className="glass alert-form"
        onSubmit={onCreate}
        data-testid="alert-form"
      >
        <div className="field">
          <label>Origem</label>
          <input name="origin" required maxLength={3} placeholder="GRU" />
        </div>
        <div className="field">
          <label>Destino</label>
          <input
            name="destination"
            required={!anyDestination}
            disabled={anyDestination}
            maxLength={3}
            placeholder={anyDestination ? "ANY" : "GIG"}
          />
        </div>
        <div className="field field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={anyDestination}
              onChange={(e) => setAnyDestination(e.target.checked)}
              data-testid="alert-any-destination"
            />{" "}
            Qualquer destino
          </label>
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
          <input
            name="maxPrice"
            type="number"
            step="0.01"
            required={!promoOnly}
          />
        </div>
        <div className="field field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={promoOnly}
              onChange={(e) => setPromoOnly(e.target.checked)}
              data-testid="alert-promo-only"
            />{" "}
            Só promoções (anomalia de preço)
          </label>
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
        <div className="alert-submit-wrap">
          <button
            className="btn btn-primary"
            type="submit"
            data-testid="alert-submit"
          >
            Criar alerta
          </button>
        </div>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="alerts-list">
        {alerts.length === 0 ? (
          <div className="glass empty-card">Nenhum alerta ainda.</div>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className="glass alert-card">
              <div>
                <strong>
                  {alert.origin} →{" "}
                  {alert.anyDestination || alert.destination === "ANY"
                    ? "qualquer destino"
                    : alert.destination}
                </strong>
                <div className="alert-card-meta">
                  {alert.departureDateFrom} → {alert.departureDateTo}
                  {alert.returnDateFrom
                    ? ` · volta ${alert.returnDateFrom}`
                    : ""}
                  {" · "}
                  {alert.maxPrice != null
                    ? `limite ${alert.currency} ${alert.maxPrice}`
                    : "sem limite de preço"}
                  {alert.promoOnly ? " · só promoção" : ""}
                  {" · "}
                  {alert.active ? "ativo" : "inativo"}
                </div>
                <div className="alert-card-detail">
                  Último preço: {alert.lastMatchedPrice ?? "—"} · última
                  checagem:{" "}
                  {alert.lastCheckedAt
                    ? new Date(alert.lastCheckedAt).toLocaleString("pt-BR")
                    : "nunca"}
                </div>
              </div>
              <div className="alert-card-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => void toggle(alert)}
                >
                  {alert.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => void remove(alert.id)}
                >
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
