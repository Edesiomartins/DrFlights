import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export default async function HistoricoPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [searches, snapshots] = await Promise.all([
    prisma.search.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.priceSnapshot.findMany({
      orderBy: { observedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="shell page-shell">
      <h1 className="page-title">
        Histórico
      </h1>

      <section className="glass content-card">
        <h2>Pesquisas recentes</h2>
        {searches.length === 0 ? (
          <p>Nenhuma pesquisa salva ainda.</p>
        ) : (
          <ul className="history-list">
            {searches.map((search) => {
              const data = search.requestData as {
                slices?: Array<{ origin?: string; destination?: string; departureDate?: string }>;
              };
              const first = data.slices?.[0];
              return (
                <li key={search.id}>
                  {first?.origin} → {first?.destination} em {first?.departureDate} ·{" "}
                  {search.createdAt.toLocaleString("pt-BR")}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="glass content-card">
        <h2>Snapshots de preço</h2>
        {snapshots.length === 0 ? (
          <p>Sem histórico de preços ainda.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th align="left">Rota</th>
                  <th align="left">Data</th>
                  <th align="left">Preço</th>
                  <th align="left">Fonte</th>
                  <th align="left">Observado</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.origin}→{s.destination}
                    </td>
                    <td>{s.departureDate}</td>
                    <td>
                      {s.amount != null
                        ? `${s.currency} ${s.amount}`
                        : s.pointsAmount
                          ? `${s.pointsAmount} pts`
                          : "—"}
                    </td>
                    <td>{s.provider}</td>
                    <td>{s.observedAt.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
