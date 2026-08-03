import Link from "next/link";
import { getAppName } from "@/lib/utils/env";

export default function PrivacidadePage() {
  const appName = getAppName();

  return (
    <div className="shell" style={{ padding: "1.5rem 0 3rem", color: "var(--sand)" }}>
      <article className="glass" style={{ borderRadius: "1.25rem", padding: "1.5rem", color: "var(--ink)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Política de Privacidade</h1>
        <p>
          O {appName} é um metabuscador de passagens. Não emitimos bilhetes e não processamos
          pagamentos de cartão nesta versão.
        </p>

        <h2>Dados que coletamos</h2>
        <ul>
          <li>Conta: nome, e-mail e hash de senha (quando você se cadastra).</li>
          <li>Pesquisas e alertas associados à sua conta.</li>
          <li>Registros técnicos de saúde dos provedores e cliques em links externos/afiliados (URL de destino, placement, parceiro, user-agent, referer e hash de IP).</li>
          <li>Preferência de cookies armazenada no seu navegador.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          Usamos cookies essenciais de sessão para autenticação. Cookies ou armazenamento local
          também guardam sua escolha no banner de consentimento. Não vendemos listas de e-mail.
        </p>

        <h2>Compartilhamento</h2>
        <p>
          Ao continuar em um fornecedor (Duffel, Kiwi, Skiplagged etc.), você deixa o {appName} e
          passa a se relacionar com a política daquele site. Podemos registrar o clique para
          medir afiliados.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode solicitar exclusão da conta e dados associados pelo e-mail administrativo
          configurado no serviço. Alertas e pesquisas vinculadas serão removidos com a conta.
        </p>

        <p style={{ fontSize: "0.9rem", opacity: 0.75 }}>
          Veja também a <Link href="/afiliados">Política de Afiliados</Link>.
        </p>
      </article>
    </div>
  );
}
