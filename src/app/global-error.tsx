"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="pt-BR">
      <body className="global-error-page">
        <div className="global-error-card">
          <h1>Erro inesperado</h1>
          <p>
            A aplicação encontrou um problema crítico.
            {error.digest ? ` Código: ${error.digest}` : ""}
          </p>
          <button type="button" onClick={reset} className="btn btn-primary">
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
