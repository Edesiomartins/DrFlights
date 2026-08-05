"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushEnableCard() {
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [vapid, status] = await Promise.all([
        fetch("/api/push/vapid-public"),
        fetch("/api/push/subscribe"),
      ]);
      if (vapid.ok) {
        const json = (await vapid.json()) as { configured?: boolean };
        setConfigured(Boolean(json.configured));
      }
      if (status.ok) {
        const json = (await status.json()) as { subscriptions?: number };
        setSubscribed((json.subscriptions ?? 0) > 0);
      }
    })();
  }, []);

  if (!configured) return null;

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Este navegador não suporta Web Push.");
        return;
      }
      const vapidRes = await fetch("/api/push/vapid-public");
      const vapid = (await vapidRes.json()) as { publicKey?: string | null };
      if (!vapid.publicKey) {
        setError("Chave VAPID indisponível.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Falha ao ativar notificações.");
        return;
      }
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao ativar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass notice-card" data-testid="push-enable-card">
      <strong>Notificações no navegador</strong>
      {subscribed ? (
        <p>Web Push ativo neste dispositivo.</p>
      ) : (
        <button
          className="btn btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => void enable()}
        >
          Ativar Web Push
        </button>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
