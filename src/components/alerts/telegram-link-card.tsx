"use client";

import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  linked: boolean;
  deepLink: string | null;
};

export function TelegramLinkCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/telegram/link");
    if (res.status === 401) {
      setStatus(null);
      return;
    }
    if (!res.ok) return;
    setStatus((await res.json()) as Status);
  }

  useEffect(() => {
    void load();
  }, []);

  if (!status) return null;

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/telegram/link", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Falha ao gerar vínculo.");
      return;
    }
    await load();
  }

  async function unlink() {
    setBusy(true);
    await fetch("/api/telegram/link", { method: "DELETE" });
    setBusy(false);
    await load();
  }

  return (
    <div className="glass notice-card" data-testid="telegram-link-card">
      <strong>Telegram</strong>
      {!status.configured ? (
        <p className="text-muted">
          Bot não configurado no servidor (TELEGRAM_BOT_TOKEN).
        </p>
      ) : status.linked ? (
        <p>
          Conta vinculada.{" "}
          <button
            className="btn btn-secondary"
            type="button"
            disabled={busy}
            onClick={() => void unlink()}
          >
            Desvincular
          </button>
        </p>
      ) : (
        <div>
          <p>Receba alertas instantâneos no Telegram.</p>
          {status.deepLink ? (
            <a
              className="btn btn-primary"
              href={status.deepLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir bot e vincular
            </a>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={() => void generate()}
            >
              Gerar link de vínculo
            </button>
          )}
        </div>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
