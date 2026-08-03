# Arquitetura da aplicação web (Busca Aérea)

Aplicação monolítica modular adicionada ao repositório `travel-hacking-toolkit`, sem alterar o plugin/skills/MCP existentes.

## Stack

- **Next.js** (App Router) + TypeScript estrito + Tailwind CSS
- **PostgreSQL** + **Prisma ORM**
- **Auth.js (NextAuth v5)** com sessões JWT e credenciais (e-mail/senha + bcryptjs)
- **Zod** para validação; **Nodemailer** para SMTP; **Vitest** para testes
- Deploy em **Coolify** (uma instância); alertas via `POST /api/cron/alerts` com `CRON_SECRET`

## Decisões

1. **Root do monólito**: a app vive em `src/` na raiz do repositório. O toolkit (`plugins/`, `skills/`, `data/`, etc.) permanece intacto.
2. **Providers**: Duffel (principal), Ignav (secundário), Seats.aero (opcional, milhas). Todos implementam `FlightProvider` e são orquestrados com `Promise.allSettled`.
3. **Cache**: tabela `Search` no PostgreSQL com TTL padrão de 600s (`SEARCH_CACHE_TTL_SECONDS`). Sem Redis.
4. **Chaves Duffel**: aceita `DUFFEL_API_KEY` ou `DUFFEL_API_KEY_LIVE` (compatibilidade com o toolkit).
5. **Admin**: e-mails em `ADMIN_EMAILS` (CSV) recebem `role=ADMIN` no cadastro/login.
6. **Aeroportos**: índice em memória a partir de `data/airport-coordinates.json` (OpenFlights / ODbL). Nunca enviado completo ao cliente.
7. **Promoções**: classificação relativa à mediana dos menores preços da mesma rota nos últimos 90 dias (≥5 amostras).
8. **Trechos separados**: opção de comparar RT vs dois one-ways; UI alerta sobre bilhetes separados.
9. **Sem fixtures em produção**: mocks apenas em `tests/`.
10. **Rate limiting**: mapa em memória por IP (adequado a instância única no Coolify).

## Fluxo de busca

```
UI → POST /api/flights/search
  → valida Zod
  → cache por requestHash
  → providers em paralelo (timeout AbortController)
  → normaliza → deduplica → ranking → promoções
  → persiste Search + PriceSnapshot
  → responde offers + providerStatuses
```

## Atribuição de dados

`data/airport-coordinates.json` deriva de OpenFlights (`airports.dat`) sob **Open Database License (ODbL)**. Fonte: https://openflights.org/data.php

## Auth no Edge

O middleware usa `auth.config.ts` (somente JWT/callbacks) via `NextAuth(authConfig)`. Providers com Prisma/bcrypt ficam em `config.ts` e não entram no bundle Edge.

## Deploy

Ver `docs/coolify-deploy.md`. Imagem multi-stage com `output: "standalone"`, migrations em `scripts/docker-entrypoint.sh`.
