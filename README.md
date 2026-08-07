# Busca Aérea

Metabuscador de passagens aéreas em Next.js: compara preços em dinheiro e milhas, salva histórico, cria alertas e redireciona o usuário ao fornecedor para concluir a compra.

Não emite bilhete e não processa pagamento.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (e-mail/senha, JWT)
- Providers: Ignav, Kiwi.com, Skiplagged, Travelpayouts
- Docker / Coolify

Fontes sem chave de API: **Kiwi.com** e **Skiplagged**.

## Desenvolvimento local

```bash
cp .env.example .env
# Preencha DATABASE_URL e AUTH_SECRET

docker compose up -d db
npm install
npx prisma migrate deploy
npm run prisma:seed   # opcional
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Scripts úteis: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Docker

```bash
docker compose up --build
```

## Coolify

Veja [docs/coolify-deploy.md](docs/coolify-deploy.md).

Arquitetura: [docs/app-architecture.md](docs/app-architecture.md).

## Dados de aeroportos

`data/airport-coordinates.json` deriva de OpenFlights ([openflights.org/data.php](https://openflights.org/data.php)), licença **ODbL**.

## Licença

MIT — ver [LICENSE](LICENSE).
