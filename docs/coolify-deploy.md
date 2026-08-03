# Deploy no Coolify

## Serviços

1. **PostgreSQL** (serviço gerenciado do Coolify ou container Postgres 16).
2. **Aplicação** a partir do `Dockerfile` deste repositório.

## Variáveis obrigatórias

- `DATABASE_URL`
- `AUTH_SECRET` (string longa aleatória)
- `APP_URL` (URL pública, ex.: `https://voos.seudominio.com`)
- `CRON_SECRET`

## Variáveis recomendadas

- `DUFFEL_API_KEY` ou `DUFFEL_API_KEY_LIVE`
- `IGNAV_API_KEY`
- `SEATS_AERO_API_KEY` (milhas)
- SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`)
- `ADMIN_EMAILS` (CSV)

O entrypoint executa `prisma migrate deploy` antes de iniciar o Node.

A app escuta em `0.0.0.0:3000`. Healthcheck: `GET /api/health`.

## Cron de alertas

No Coolify, agende um job periódico (ex.: a cada 30 min):

```bash
curl -X POST "$APP_URL/api/cron/alerts" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Observações

- Não coloque chaves em `NEXT_PUBLIC_*`.
- Uma única instância é suficiente (rate limit e cron em memória/processo).
- O toolkit (`plugins/`, skills, MCP) permanece no repositório, mas a imagem Docker da app usa apenas `src/`, `prisma/`, `data/` e artefatos de build.
