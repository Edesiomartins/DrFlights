# Deploy no Coolify (VPS)

Repositório: `https://github.com/Edesiomartins/DrFlights.git`  
A app já tem página inicial em `/` (formulário de busca). Depois do ar, dá para evoluir o visual sem mudar a arquitetura.

## 1. Pré-requisitos na VPS

- Coolify instalado e acessível
- Domínio (ou subdomínio) apontando para o IP da VPS (A/AAAA)
- Conta GitHub com o repo `DrFlights` (público ou com deploy key / GitHub App no Coolify)

## 2. Criar o PostgreSQL

No Coolify:

1. **New Resource** → **Database** → **PostgreSQL** (16+)
2. Anote usuário, senha, host interno e porta
3. Crie o database, por exemplo: `busca_aerea`

`DATABASE_URL` no formato:

```text
postgresql://USER:PASSWORD@HOST:5432/busca_aerea?schema=public
```

No Coolify, use o **hostname interno** do serviço Postgres (não `localhost`), algo como `postgresql-xxxxxxxx`.

## 3. Criar a aplicação

1. **New Resource** → **Application**
2. Fonte: **GitHub** → `Edesiomartins/DrFlights`
3. Branch: `main`
4. Build Pack: **Dockerfile**
5. Dockerfile location: `Dockerfile` (raiz)
6. Port: `3000`
7. Healthcheck path: `/api/health`

O entrypoint já roda `prisma migrate deploy` antes de subir o Node.

## 4. Variáveis de ambiente (obrigatórias)

Gere segredos longos (ex.: `openssl rand -hex 32`).

| Variável | Exemplo / nota |
|----------|----------------|
| `DATABASE_URL` | URL do Postgres do passo 2 |
| `AUTH_SECRET` | string aleatória longa |
| `APP_URL` | `https://voos.seudominio.com` (URL pública final) |
| `CRON_SECRET` | string aleatória para o cron de alertas |
| `NEXT_PUBLIC_APP_NAME` | `Busca Aérea` (ou o nome da marca) |
| `DEFAULT_CURRENCY` | `BRL` |
| `PROVIDER_TIMEOUT_MS` | `20000` |
| `SEARCH_CACHE_TTL_SECONDS` | `600` |

Admin no cadastro/login:

```env
ADMIN_EMAILS=seuemail@dominio.com
```

## 5. Variáveis opcionais (busca real)

**Já ativos sem chave:** Kiwi.com e Skiplagged (fontes gratuitas).

Para mais cobertura / milhas, configure:

```env
DUFFEL_API_KEY=
# ou:
DUFFEL_API_KEY_LIVE=
IGNAV_API_KEY=
SEATS_AERO_API_KEY=
```

SMTP (alertas por e-mail):

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Busca Aerea <noreply@seudominio.com>
```

## 6. Domínio e HTTPS

1. Em **Domains**, adicione `voos.seudominio.com` (ou o domínio escolhido)
2. Ative o proxy / Let's Encrypt no Coolify
3. Confirme que `APP_URL` é exatamente a URL pública com `https://`

## 7. Deploy

1. **Deploy**
2. Aguarde o build (Node 22, multi-stage)
3. Teste:
   - `https://SEU_DOMINIO/` → página de busca
   - `https://SEU_DOMINIO/api/health` → JSON com status
   - `/cadastro` e `/entrar`

## 8. Cron de alertas (Coolify Scheduled Task)

Crie um job a cada 30 minutos:

```bash
curl -fsS -X POST "$APP_URL/api/cron/alerts" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Substitua pelas variáveis reais do ambiente (ou use o hostname interno da app no Coolify).

## 9. Depois do ar: “colocar uma página”

A home já existe (`src/app/page.tsx`). Fluxo recomendado para customizar marca/landing:

1. Ajuste `NEXT_PUBLIC_APP_NAME` no Coolify
2. Edite `src/app/page.tsx` e `src/app/globals.css`
3. Commit + push em `main` → Coolify redesploy automático (se webhook estiver ativo)

Não é necessário outro repositório nem microsserviço para a página pública.

## Anúncios (Coolify)

```env
ADS_ENABLED=true
ADS_DEMO=false
ADS_CONFIG_JSON=[{"id":"home-1","placement":"home_top","enabled":true,"title":"Parceiro","description":"Oferta","ctaLabel":"Ver","targetUrl":"https://parceiro.exemplo","partner":"parceiro","sponsored":true}]
```

Placements: `home_top`, `home_bottom`, `results_top`, `results_inline`, `footer`.

Cliques passam por `/api/go` e gravam na tabela `AffiliateClick`.

- [ ] Postgres healthy
- [ ] App build OK
- [ ] `/api/health` retorna `status: ok` e `database: ok`
- [ ] Domínio HTTPS funcionando
- [ ] `APP_URL` igual ao domínio público
- [ ] Pelo menos uma chave de voo (Duffel ou Ignav) se quiser resultados reais
- [ ] Cron de alertas configurado (se for usar alertas)

## Observações

- Não coloque segredos em variáveis `NEXT_PUBLIC_*` (exceto o nome público da app).
- Uma única instância da app é suficiente.
- A imagem Docker usa `src/`, `prisma/`, `data/` e artefatos de build.
