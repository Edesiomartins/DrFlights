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
2. Providers: Duffel (principal), Ignav (secundário), Seats.aero (opcional). Orquestração com `Promise.allSettled`.
3. Cache na tabela `Search` (TTL padrão 600s). Sem Redis.
4. Chaves Duffel: `DUFFEL_API_KEY` ou `DUFFEL_API_KEY_LIVE`.
5. Admin via `ADMIN_EMAILS` (CSV) no cadastro/login.
6. Aeroportos indexados em memória a partir de `data/airport-coordinates.json` (OpenFlights / ODbL).
7. Promoções por mediana histórica da rota (90 dias, ≥5 amostras).
8. Rate limit em memória (instância única).
9. Middleware Edge usa `auth.config.ts` (sem Prisma/bcrypt no bundle Edge).

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
