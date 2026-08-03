"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    void fetch("/api/monitoring/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      /* ignore */
    });
  }, [error]);

  return (
    <div className="shell" style={{ padding: "2.5rem 0" }}>
      <div
        className="glass"
        style={{
          borderRadius: "1.25rem",
          padding: "1.75rem",
          maxWidth: 560,
          display: "grid",
          gap: "1rem",
        }}
      >
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
          Algo deu errado
        </h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Não foi possível carregar esta página. Você pode tentar novamente.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Tentar novamente
          </button>
          <Link className="btn btn-secondary" href="/">
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
