"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#0b1f2a",
          color: "#f3ebe0",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            color: "#102033",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            maxWidth: 480,
            width: "100%",
            display: "grid",
            gap: "1rem",
          }}
        >
          <h1 style={{ margin: 0 }}>Erro inesperado</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>
            A aplicação encontrou um problema crítico.
            {error.digest ? ` Código: ${error.digest}` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "0.75rem 1.25rem",
              fontWeight: 700,
              background: "#e07a3d",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
