import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="shell state-page">
      <div className="glass state-card">
        <h1>
          Página não encontrada
        </h1>
        <p>
          O endereço que você abriu não existe ou foi movido.
        </p>
        <Link className="btn btn-primary state-primary" href="/">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
