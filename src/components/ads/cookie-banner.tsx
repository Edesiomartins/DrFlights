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
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      data-testid="cookie-banner"
    >
      <div>
        <strong className="cookie-banner-title">Cookies e privacidade</strong>
        <p className="cookie-banner-copy">
          Usamos cookies essenciais para login e preferências. Cliques em links de parceiros
          podem ser registrados de forma agregada para medir afiliados. Veja a{" "}
          <Link href="/privacidade">
            Política de Privacidade
          </Link>{" "}
          e a{" "}
          <Link href="/afiliados">
            Política de Afiliados
          </Link>
          .
        </p>
      </div>
      <div className="cookie-banner-actions">
        <button
          type="button"
          className="btn btn-primary"
          data-testid="cookie-accept"
          onClick={() => save("accepted")}
        >
          Aceitar
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="cookie-reject-ads"
          onClick={() => save("essential")}
        >
          Apenas essenciais
        </button>
      </div>
    </div>
  );
}
