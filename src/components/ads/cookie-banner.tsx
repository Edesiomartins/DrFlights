"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "busca-aerea-cookie-consent";

type Consent = "accepted" | "essential" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "accepted" || saved === "essential") {
        setConsent(saved);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function save(value: Exclude<Consent, null>) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setConsent(value);
  }

  if (!ready || consent) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      style={{
        position: "fixed",
        zIndex: 80,
        left: "50%",
        bottom: "1rem",
        transform: "translateX(-50%)",
        width: "min(720px, calc(100% - 1.5rem))",
        background: "rgba(255,255,255,0.97)",
        color: "var(--ink)",
        border: "1px solid rgba(16,32,51,0.12)",
        borderRadius: "1.1rem",
        boxShadow: "var(--shadow)",
        padding: "1rem 1.15rem",
        display: "grid",
        gap: "0.85rem",
      }}
    >
      <div>
        <strong style={{ fontFamily: "var(--font-display)" }}>Cookies e privacidade</strong>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.92rem", opacity: 0.85 }}>
          Usamos cookies essenciais para login e preferências. Cliques em links de parceiros
          podem ser registrados de forma agregada para medir afiliados. Veja a{" "}
          <Link href="/privacidade" style={{ textDecoration: "underline" }}>
            Política de Privacidade
          </Link>{" "}
          e a{" "}
          <Link href="/afiliados" style={{ textDecoration: "underline" }}>
            Política de Afiliados
          </Link>
          .
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={() => save("accepted")}>
          Aceitar
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => save("essential")}>
          Apenas essenciais
        </button>
      </div>
    </div>
  );
}
