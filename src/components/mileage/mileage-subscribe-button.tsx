"use client";

import { useState } from "react";

export function MileageSubscribeButton({ initialActive = false }: { initialActive?: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !active;
    const response = await fetch("/api/mileage-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: next }) });
    if (response.status === 401) { setMessage("Entre na sua conta para ativar este alerta."); setLoading(false); return; }
    if (!response.ok) { setMessage("Não foi possível atualizar o alerta agora."); setLoading(false); return; }
    setActive(next);
    setMessage(next ? "Alerta de promoções ativado." : "Alerta desativado.");
    setLoading(false);
  }

  return <div className="mileage-subscribe"><button className={`btn ${active ? "btn-secondary" : "btn-primary"}`} type="button" disabled={loading} onClick={() => void toggle()}>{loading ? "Atualizando…" : active ? "Desativar alerta de milhas" : "Receber alertas de milhas"}</button>{message ? <span role="status">{message}</span> : null}</div>;
}
