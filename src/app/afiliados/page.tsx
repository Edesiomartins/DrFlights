import Link from "next/link";
import { getAppName } from "@/lib/utils/env";

export default function AfiliadosPage() {
  const appName = getAppName();

  return (
    <div className="shell page-shell legal-page">
      <article className="glass content-card legal-card">
        <h1>Política de Afiliados</h1>
        <p>
          O {appName} pode exibir espaços publicitários e links de parceiros. Alguns links geram
          comissão se você concluir uma compra no site do parceiro — sem custo extra para você.
        </p>

        <h2>Conteúdo patrocinado</h2>
        <p>
          Anúncios e destaques pagos são identificados com o selo <strong>Patrocinado</strong>.
          Resultados orgânicos de busca de passagens continuam rotulados pela fonte (Duffel, Kiwi,
          Skiplagged, etc.).
        </p>

        <h2>Transparência de ranking</h2>
        <p>
          A ordenação padrão das ofertas usa preço, duração, escalas, bagagem e flexibilidade.
          Espaços de anúncio não alteram o algoritmo de ranking das ofertas de voo.
        </p>

        <h2>Redirecionamento</h2>
        <p>
          Cliques em anúncios e em alguns botões “Continuar no fornecedor” passam por{" "}
          <code>/api/go</code>, que registra o evento e redireciona ao destino. Não armazenamos
          dados de cartão.
        </p>

        <h2>Isenção</h2>
        <p>
          Preços e disponibilidade mudam rapidamente. Confirme sempre no site do fornecedor antes
          de comprar. Ofertas com bilhetes separados ou hidden-city possuem riscos próprios,
          sinalizados na interface quando detectados.
        </p>

        <p className="legal-related">
          Veja também a <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </article>
    </div>
  );
}
