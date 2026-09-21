# Watchlist

Plataforma para acompanhar e avaliar filmes, séries e animes: biblioteca pessoal, diário, coleções, avaliações, rankings, calendário de lançamentos, estatísticas, badges e um "Wrapped" anual, com perfis públicos e feed de atividade.

## Stack

Monorepo com **pnpm workspaces** + **Turborepo**.

| Camada | Tecnologias |
| --- | --- |
| Web (`apps/web`) | Next.js 16, React 19, Tailwind CSS 4, Radix UI, cmdk, motion, sonner |
| API (`apps/api`) | Fastify 5, Zod (fastify-type-provider-zod), Swagger UI, Pino, Argon2, Resend |
| Banco (`packages/db`) | PostgreSQL (Neon), Drizzle ORM + drizzle-kit |
| Compartilhado (`packages/shared`) | Schemas Zod, enums e tipos usados por web e API |
| Fontes de mídia | TMDB e uma API de animes (configurável) |
| Deploy | Railway (Nixpacks) |

## Estrutura

```
apps/
  api/            API Fastify
    src/routes/     endpoints (auth, library, entries, diary, collections, reviews, rankings, stats, wrapped, ...)
    src/services/   regras de negócio
    src/clients/    integrações TMDB / anime
    src/jobs/       jobs (sincronização de temporadas e exibição, badges, importação MAL, limpeza)
    src/cron.ts     processo separado que enfileira e drena os jobs diários
  web/            Next.js (App Router)
    src/app/(landing) landing e /entrar
    src/app/(feed)    área logada: início, biblioteca, diário, calendário, coleções, estatísticas, badges, importar, config
    src/app/(public*) páginas públicas: buscar, ranking, perfis (u), coleções (c), media, wrapped
packages/
  db/             schema Drizzle, migrations e cliente
  shared/         contratos compartilhados (Zod)
```

## Requisitos

- Node.js >= 22 (ver `.nvmrc`)
- pnpm 9.15.9 (`corepack enable`)
- Um banco PostgreSQL (o projeto usa Neon)

## Como rodar

```bash
pnpm install

# variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# preencha os valores (ver abaixo)

# migrations
pnpm --filter @watchlist/db migrate

# (opcional) dados iniciais
pnpm --filter @watchlist/api seed

# web (http://localhost:3001) e API (porta 3333 por padrão)
pnpm dev
```

> Em desenvolvimento, acesse o front por `localhost`, não `127.0.0.1`, senão o React pode não hidratar.

### Variáveis de ambiente

**`apps/api/.env`**

| Variável | Uso |
| --- | --- |
| `PORT`, `NODE_ENV`, `LOG_LEVEL` | Servidor e logs |
| `DATABASE_URL` | Connection string do Postgres (pooled, `sslmode=require`) |
| `WEB_ORIGIN` | Origem do front (links de e-mail e callback OAuth) |
| `COOKIE_SECRET` | Assinatura de cookies |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Login com Google |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio de e-mails |
| `SESSION_TTL_DAYS` | Duração da sessão |
| `TMDB_API_KEY` | Filmes e séries |
| `ANIME_API_URL`, `ANIME_API_TOKEN`, `ANIME_API_RATE_LIMIT`, `ANIME_API_MIN_INTERVAL_MS` | API de animes |
| `MEDIA_TTL_HOURS` | Tempo de cache dos metadados de mídia |

**`apps/web/.env.local`**

| Variável | Uso |
| --- | --- |
| `API_ORIGIN` | Destino do rewrite `/api/*`. O browser chama caminhos relativos e nunca conhece a origem da API |

## Scripts

Na raiz:

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Sobe web e API em modo dev (Turborepo) |
| `pnpm build` | Build de todos os pacotes |
| `pnpm start` | Inicia a API compilada (`apps/api/dist`) |
| `pnpm typecheck` | Checagem de tipos em todo o monorepo |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |

Banco (`packages/db`): `generate` (gera migration), `migrate`, `studio`.

## Jobs diários

O trabalho recorrente roda em um processo separado (`apps/api/src/cron.ts`), não dentro da API. Ele sobe, recupera jobs órfãos, enfileira os jobs diários, drena a fila e encerra. Assim a API pode ficar em modo serverless/sleep sem precisar estar acordada no horário agendado.

## Documentação da API

A API expõe a documentação OpenAPI via Swagger UI (`@fastify/swagger-ui`) quando rodando.

## Deploy

Configurado para Railway (`nixpacks.toml`, `.railway/`), com Node 22 e pnpm 9.15.9.
