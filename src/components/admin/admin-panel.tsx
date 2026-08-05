"use client";

import { useEffect, useMemo, useState } from "react";
import {
  classifyProviderStatus,
  formatHealthResultLine,
  nextCircuitRetryAt,
  summarizeProviderStatuses,
  unconfiguredDetail,
  type ProviderStatusRow,
  type ProviderStatusTone,
} from "@/lib/admin/provider-status-display";

type Stats = {
  users: number;
  searches: number;
  activeAlerts: number;
  providers: ProviderStatusRow[];
  topRoutes: Array<{ route: string; count: number }>;
};

type MileagePromo = {
  id: string;
  sourceProgram: string;
  destinationProgram: string;
  bonusPercent: number;
  validUntil: string;
  officialUrl: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
};

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: ProviderStatusTone;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

export function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promos, setPromos] = useState<MileagePromo[]>([]);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) {
      setError("Acesso negado ou falha ao carregar estatísticas.");
      return;
    }
    setStats((await res.json()) as Stats);
    const promoRes = await fetch("/api/admin/mileage-promos");
    if (promoRes.ok) setPromos(((await promoRes.json()) as { promos: MileagePromo[] }).promos);
  }

  useEffect(() => {
    void load();
  }, []);

  async function runHealth() {
    setHealthMsg("Verificando providers…");
    const res = await fetch("/api/admin/providers/health", { method: "POST" });
    if (!res.ok) {
      setHealthMsg("Falha no healthcheck dos providers.");
      return;
    }
    const json = (await res.json()) as {
      results: Array<{
        provider: string;
        configured: boolean;
        ok: boolean;
        message: string;
        latencyMs?: number;
      }>;
    };
    setHealthMsg(json.results.map(formatHealthResultLine).join(" | "));
    await load();
  }

  async function createPromo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPromoMessage("Salvando promoção…");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/mileage-promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceProgram: form.get("sourceProgram"),
        destinationProgram: form.get("destinationProgram"),
        bonusPercent: Number(form.get("bonusPercent")),
        validUntil: form.get("validUntil"),
        officialUrl: form.get("officialUrl"),
      }),
    });
    if (!res.ok) { setPromoMessage("Não foi possível salvar. Revise os campos."); return; }
    event.currentTarget.reset();
    setPromoMessage("Promoção publicada e assinantes processados.");
    await load();
  }

  async function setPromoStatus(id: string, status: MileagePromo["status"]) {
    const res = await fetch(`/api/admin/mileage-promos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { setPromoMessage("Status atualizado."); await load(); }
  }

  const summary = useMemo(
    () => (stats ? summarizeProviderStatuses(stats.providers) : null),
    [stats],
  );

  if (error) {
    return (
      <div className="glass content-card">
        {error}
      </div>
    );
  }

  if (!stats || !summary) {
    return (
      <div className="glass content-card">
        Carregando…
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <section className="glass admin-stats">
        <div>
          <div className="admin-stat-label">Usuários</div>
          <strong className="admin-stat-value">{stats.users}</strong>
        </div>
        <div>
          <div className="admin-stat-label">Pesquisas</div>
          <strong className="admin-stat-value">{stats.searches}</strong>
        </div>
        <div>
          <div className="admin-stat-label">Alertas ativos</div>
          <strong className="admin-stat-value">{stats.activeAlerts}</strong>
        </div>
      </section>

      <section className="glass content-card">
        <div className="admin-section-head">
          <h2>Providers</h2>
          <button className="btn btn-primary" type="button" onClick={() => void runHealth()}>
            Executar healthcheck
          </button>
        </div>

        <div className="admin-health-summary">
          <div>
            <div className="admin-stat-label">Operacionais</div>
            <strong className="admin-health-value text-ok">
              {summary.operational}
            </strong>
          </div>
          <div>
            <div className="admin-stat-label">Não configurados</div>
            <strong className="admin-health-value text-muted">
              {summary.unconfigured}
            </strong>
          </div>
          <div>
            <div className="admin-stat-label">Com falha</div>
            <strong className="admin-health-value text-danger">
              {summary.failed}
            </strong>
          </div>
          <div>
            <div className="admin-stat-label">Pausados</div>
            <strong className="admin-health-value text-warn">
              {summary.paused}
            </strong>
          </div>
        </div>

        {healthMsg ? (
          <p className="admin-health-message">{healthMsg}</p>
        ) : null}

        <div className="table-scroll admin-table-wrap">
          <table className="data-table admin-table">
            <thead>
              <tr>
                <th align="left">
                  Provider
                </th>
                <th align="left">
                  Status
                </th>
                <th align="left">
                  Latência
                </th>
                <th align="left">
                  Detalhe
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.providers.map((p) => {
                const view = classifyProviderStatus(p);
                const retryAt =
                  view.category === "paused"
                    ? nextCircuitRetryAt(p.circuitOpenedAt)
                    : null;
                const showError =
                  view.category === "failed" || view.category === "paused"
                    ? p.lastError
                    : view.category === "unconfigured"
                      ? p.lastError
                      : null;

                return (
                  <tr key={p.provider}>
                    <td className="admin-provider-name">
                      {p.provider}
                    </td>
                    <td>
                      <StatusBadge label={view.label} tone={view.tone} />
                    </td>
                    <td>
                      {view.category === "unconfigured"
                        ? "—"
                        : p.lastLatencyMs != null
                          ? `${p.lastLatencyMs}ms`
                          : "—"}
                    </td>
                    <td className={`admin-provider-detail admin-provider-detail--${view.category}`}>
                      {view.category === "paused" ? (
                        <>
                          {showError ? <div>{showError}</div> : null}
                          <div>
                            Nova tentativa aprox.:{" "}
                            {retryAt
                              ? retryAt.toLocaleString("pt-BR")
                              : "em breve"}
                          </div>
                        </>
                      ) : view.category === "failed" ? (
                        <>
                          {showError ?? "Falha sem detalhe"}
                          {p.lastLatencyMs != null ? (
                            <div className="text-muted">
                              Latência do health: {p.lastLatencyMs}ms
                            </div>
                          ) : null}
                        </>
                      ) : view.category === "unconfigured" ? (
                        unconfiguredDetail(p.provider, showError)
                      ) : p.lastSuccessAt ? (
                        `Último sucesso: ${new Date(p.lastSuccessAt).toLocaleString("pt-BR")}`
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass content-card">
        <h2>Rotas mais pesquisadas (amostra recente)</h2>
        {stats.topRoutes.length === 0 ? (
          <p>Sem dados ainda.</p>
        ) : (
          <ul>
            {stats.topRoutes.map((r) => (
              <li key={r.route}>
                {r.route}: {r.count}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass content-card">
        <div className="admin-section-head"><div><span className="section-kicker">Milhas</span><h2>Transferências bonificadas</h2></div></div>
        <form className="admin-promo-form" onSubmit={(event) => void createPromo(event)}>
          <label>Programa de origem<input name="sourceProgram" required placeholder="Ex.: Livelo" /></label>
          <label>Programa de destino<input name="destinationProgram" required placeholder="Ex.: Smiles" /></label>
          <label>Bônus (%)<input name="bonusPercent" required type="number" min="1" max="300" /></label>
          <label>Válida até<input name="validUntil" required type="datetime-local" /></label>
          <label className="admin-promo-url">Link oficial<input name="officialUrl" required type="url" placeholder="https://…" /></label>
          <button className="btn btn-primary" type="submit">Publicar promoção</button>
        </form>
        {promoMessage ? <p className="admin-health-message" role="status">{promoMessage}</p> : null}
        <div className="admin-promo-list">
          {promos.map((promo) => <article key={promo.id} className="admin-promo-row">
            <div><strong>{promo.sourceProgram} → {promo.destinationProgram}</strong><span>{promo.bonusPercent}% · até {new Date(promo.validUntil).toLocaleString("pt-BR")}</span></div>
            <StatusBadge label={promo.status === "ACTIVE" ? "Ativa" : promo.status === "EXPIRED" ? "Expirada" : "Inativa"} tone={promo.status === "ACTIVE" ? "ok" : "neutral"} />
            <button className="btn btn-secondary" type="button" onClick={() => void setPromoStatus(promo.id, promo.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{promo.status === "ACTIVE" ? "Desativar" : "Ativar"}</button>
          </article>)}
          {promos.length === 0 ? <p className="text-muted">Nenhuma promoção cadastrada.</p> : null}
        </div>
      </section>
    </div>
  );
}
