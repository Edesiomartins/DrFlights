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

const TONE_STYLE: Record<
  ProviderStatusTone,
  { color: string; background: string }
> = {
  neutral: {
    color: "rgba(16,32,51,0.72)",
    background: "rgba(16,32,51,0.08)",
  },
  ok: {
    color: "var(--ok)",
    background: "rgba(31,138,91,0.12)",
  },
  danger: {
    color: "var(--danger)",
    background: "rgba(179,58,58,0.12)",
  },
  warn: {
    color: "var(--warn)",
    background: "rgba(201,133,26,0.14)",
  },
};

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: ProviderStatusTone;
}) {
  const style = TONE_STYLE[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.25rem 0.65rem",
        borderRadius: 999,
        fontSize: "0.82rem",
        fontWeight: 700,
        color: style.color,
        background: style.background,
      }}
    >
      {label}
    </span>
  );
}

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

  const summary = useMemo(
    () => (stats ? summarizeProviderStatuses(stats.providers) : null),
    [stats],
  );

  if (error) {
    return (
      <div className="glass" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
        {error}
      </div>
    );
  }

  if (!stats || !summary) {
    return (
      <div className="glass" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
        Carregando…
      </div>
    );
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>Providers</h2>
          <button className="btn btn-primary" type="button" onClick={() => void runHealth()}>
            Executar healthcheck
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
            marginTop: "1rem",
          }}
        >
          <div>
            <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>Operacionais</div>
            <strong style={{ color: "var(--ok)", fontSize: "1.35rem" }}>
              {summary.operational}
            </strong>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>Não configurados</div>
            <strong style={{ color: "rgba(16,32,51,0.65)", fontSize: "1.35rem" }}>
              {summary.unconfigured}
            </strong>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>Com falha</div>
            <strong style={{ color: "var(--danger)", fontSize: "1.35rem" }}>
              {summary.failed}
            </strong>
          </div>
          <div>
            <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>Pausados</div>
            <strong style={{ color: "var(--warn)", fontSize: "1.35rem" }}>
              {summary.paused}
            </strong>
          </div>
        </div>

        {healthMsg ? (
          <p style={{ fontSize: "0.9rem", marginTop: "1rem" }}>{healthMsg}</p>
        ) : null}

        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th align="left" style={{ padding: "0.45rem 0.35rem" }}>
                  Provider
                </th>
                <th align="left" style={{ padding: "0.45rem 0.35rem" }}>
                  Status
                </th>
                <th align="left" style={{ padding: "0.45rem 0.35rem" }}>
                  Latência
                </th>
                <th align="left" style={{ padding: "0.45rem 0.35rem" }}>
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
                  <tr key={p.provider} style={{ borderTop: "1px solid rgba(16,32,51,0.08)" }}>
                    <td style={{ padding: "0.7rem 0.35rem", fontWeight: 600 }}>
                      {p.provider}
                    </td>
                    <td style={{ padding: "0.7rem 0.35rem" }}>
                      <StatusBadge label={view.label} tone={view.tone} />
                    </td>
                    <td style={{ padding: "0.7rem 0.35rem" }}>
                      {view.category === "unconfigured"
                        ? "—"
                        : p.lastLatencyMs != null
                          ? `${p.lastLatencyMs}ms`
                          : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.7rem 0.35rem",
                        maxWidth: 360,
                        wordBreak: "break-word",
                        fontSize: "0.9rem",
                        color:
                          view.category === "failed"
                            ? "var(--danger)"
                            : view.category === "paused"
                              ? "var(--warn)"
                              : "rgba(16,32,51,0.7)",
                      }}
                    >
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
                            <div style={{ opacity: 0.75 }}>
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
