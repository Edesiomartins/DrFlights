"use client";

import { useEffect, useState } from "react";

type Stats = {
  users: number;
  searches: number;
  activeAlerts: number;
  providers: Array<{
    provider: string;
    enabled: boolean;
    lastStatus: string | null;
    lastLatencyMs: number | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastError: string | null;
  }>;
  topRoutes: Array<{ route: string; count: number }>;
};

export function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) {
      setError("Acesso negado ou falha ao carregar estatísticas.");
      return;
    }
    setStats((await res.json()) as Stats);
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
      results: Array<{ provider: string; ok: boolean; message: string; latencyMs?: number }>;
    };
    setHealthMsg(
      json.results
        .map(
          (r) =>
            `${r.provider}: ${r.ok ? "ok" : "falha"} (${r.latencyMs ?? "—"}ms) — ${r.message}`,
        )
        .join(" | "),
    );
    await load();
  }

  if (error) {
    return <div className="glass" style={{ padding: "1.25rem", borderRadius: "1rem" }}>{error}</div>;
  }

  if (!stats) {
    return <div className="glass" style={{ padding: "1.25rem", borderRadius: "1rem" }}>Carregando…</div>;
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section
        className="glass"
        style={{
          borderRadius: "1.25rem",
          padding: "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ opacity: 0.7 }}>Usuários</div>
          <strong style={{ fontSize: "1.6rem" }}>{stats.users}</strong>
        </div>
        <div>
          <div style={{ opacity: 0.7 }}>Pesquisas</div>
          <strong style={{ fontSize: "1.6rem" }}>{stats.searches}</strong>
        </div>
        <div>
          <div style={{ opacity: 0.7 }}>Alertas ativos</div>
          <strong style={{ fontSize: "1.6rem" }}>{stats.activeAlerts}</strong>
        </div>
      </section>

      <section className="glass" style={{ borderRadius: "1.25rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Providers</h2>
          <button className="btn btn-primary" type="button" onClick={() => void runHealth()}>
            Executar healthcheck
          </button>
        </div>
        {healthMsg ? <p style={{ fontSize: "0.9rem" }}>{healthMsg}</p> : null}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.75rem" }}>
          <thead>
            <tr>
              <th align="left">Provider</th>
              <th align="left">Status</th>
              <th align="left">Latência</th>
              <th align="left">Último sucesso</th>
              <th align="left">Erro</th>
            </tr>
          </thead>
          <tbody>
            {stats.providers.map((p) => (
              <tr key={p.provider}>
                <td>{p.provider}</td>
                <td>
                  {p.enabled ? "habilitado" : "desativado"} / {p.lastStatus ?? "—"}
                </td>
                <td>{p.lastLatencyMs != null ? `${p.lastLatencyMs}ms` : "—"}</td>
                <td>
                  {p.lastSuccessAt
                    ? new Date(p.lastSuccessAt).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td style={{ maxWidth: 280, wordBreak: "break-word" }}>{p.lastError ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="glass" style={{ borderRadius: "1.25rem", padding: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Rotas mais pesquisadas (amostra recente)</h2>
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
    </div>
  );
}
