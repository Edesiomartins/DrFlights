# Arquitetura — Busca Aérea

Aplicação monolítica modular para metabusca de passagens, preparada para uma instância no Coolify.

## Stack

- **Next.js** (App Router) + TypeScript estrito + Tailwind CSS
- **PostgreSQL** + **Prisma ORM**
- **Auth.js (NextAuth v5)** com sessões JWT e credenciais (e-mail/senha + bcryptjs)
- **Zod** para validação; **Nodemailer** para SMTP; **Vitest** para testes
- Deploy em **Coolify**; alertas via `POST /api/cron/alerts` com `CRON_SECRET`

## Decisões

1. App em `src/` na raiz do repositório.
2. Providers: Duffel, Ignav, **Kiwi.com** (gratuito), **Skiplagged** (gratuito), Seats.aero (opcional). Orquestração com `Promise.allSettled`.
3. Cache na tabela `Search` (TTL padrão 600s). Sem Redis.
4. Chaves Duffel: `DUFFEL_API_KEY` ou `DUFFEL_API_KEY_LIVE`.
5. Kiwi e Skiplagged usam endpoints HTTP públicos (`mcp.kiwi.com`, `mcp.skiplagged.com`) **sem API key** — são fontes de dados no backend, não dependência de Claude/MCP tooling.
6. Admin via `ADMIN_EMAILS` (CSV) no cadastro/login.
7. Aeroportos indexados em memória a partir de `data/airport-coordinates.json` (OpenFlights / ODbL).
8. Promoções por mediana histórica da rota (90 dias, ≥5 amostras).
9. Rate limit em memória (instância única).
10. Middleware Edge usa `auth.config.ts` (sem Prisma/bcrypt no bundle Edge).
11. Ofertas Kiwi/Skiplagged com self-transfer ou hidden-city são marcadas e exibem aviso na UI.

## Dados mantidos em `data/`

- `airport-coordinates.json` — autocomplete
- `points-valuations.json` — cpp aproximado (Seats.aero)
- `transfer-partners.json` — caminhos de transferência (Seats.aero)

## Fluxo de busca

```
UI → POST /api/flights/search
  → valida Zod
  → cache por requestHash
  → providers em paralelo
  → normaliza → deduplica → ranking → promoções
  → persiste Search + PriceSnapshot
```

## Deploy

Ver `docs/coolify-deploy.md`.
