import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="shell" style={{ padding: "2.5rem 0" }}>
      <div
        className="glass"
        style={{
          borderRadius: "1.25rem",
          padding: "1.75rem",
          maxWidth: 520,
          display: "grid",
          gap: "1rem",
        }}
      >
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
          Página não encontrada
        </h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          O endereço que você abriu não existe ou foi movido.
        </p>
        <Link className="btn btn-primary" href="/" style={{ width: "fit-content" }}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
