# ERP Fiscal Suite

Monorepo de mini ERP fiscal com empresas emissoras, clientes, titulares, usuarios, emissao de NFS-e, backend NestJS, frontend Next.js, sessoes com iron-session, consumo via TanStack Query/mutations e Prisma ORM.

## Stack

- `apps/api`: NestJS, Prisma, MySQL, Redis/BullMQ, class-validator, bcryptjs
- `apps/web`: Next.js App Router, iron-session, TanStack Query, Yup, Tailwind CSS, lucide-react
- `pnpm workspaces`: scripts raiz para dev, build, lint, test e banco

## Modulos

- `auth`: login no Nest; sessao persistida no Next com iron-session
- `onboarding`: fluxo inicial de contratacao que valida JWT, cria tenant e vincula o usuario existente como titular em transacao
- `tenants`: administracao de empresas emissoras ja contratadas, com dados fiscais, CNPJ, inscricoes, endereco e provider fiscal
- `tenant titulares`: vinculo entre empresa e usuario titular
- `tenant fiscal credentials`: credenciais fiscais criptografadas por tenant/provider
- `clients`: clientes/tomadores vinculados ao tenant, com auditoria de usuario criador
- `service invoices`: emissao e historico de NFS-e por provider fiscal, com fila em background para processamento fiscal
- `queue`: configuracao BullMQ/Redis usada por API e worker fiscal
- `users`: CRUD completo de usuarios
- `profiles`: modulo ligado ao usuario para perfil profissional, skills e disponibilidade
- `prisma`: PrismaService global para acesso ao banco

## Estrutura

- API: `apps/api/src/modules/<module>` com camadas `presentation`, `application`, `domain` e `infrastructure`.
- Web: `apps/web/src/modules/<module>/components` para UI de dominio; `src/app` permanece para o App Router.
- Web shared API: `apps/web/src/shared/api` centraliza HTTP client, QueryClient e query keys.
- Prisma: `apps/api/prisma/schema.prisma` + `apps/api/prisma/models/*.prisma` separados por dominio.

## Scripts

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:migrate -- --name nome_da_mudanca
pnpm db:seed
pnpm dev
```

`pnpm dev` sobe API, Web e worker fiscal em paralelo. Para rodar sem worker:

```bash
pnpm dev:no-worker
```

Scripts separados:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:worker
pnpm build
pnpm lint
pnpm test
pnpm docker:infra
pnpm db:studio
pnpm onboarding:token -- --email "$SEED_ADMIN_EMAIL"
```

## Docker

O ambiente Docker usa containers separados para `mysql`, `redis`, `api`, `worker` e `web`. Esse e o arranjo recomendado: banco e fila ficam persistentes/isolados, enquanto frontend, backend e worker podem ser rebuildados ou reiniciados sem apagar dados.

O `docker-compose.yml` e voltado para desenvolvimento local. MySQL e API ficam publicados apenas em `127.0.0.1`, nao em todas as interfaces da maquina.

Para desenvolver local com Node no host:

```bash
pnpm docker:infra
pnpm db:migrate:deploy
pnpm dev
```

`pnpm docker:infra` sobe apenas `mysql` e `redis`.

```bash
pnpm docker:up
```

Ou diretamente:

```bash
docker compose up --build
```

Servicos:

- `mysql`: MySQL 8.4 em `127.0.0.1:3306`
- `redis`: Redis/BullMQ em `127.0.0.1:6379`
- `api`: NestJS em `127.0.0.1:3333`
- `worker`: processo Nest sem HTTP que consome a fila fiscal
- `web`: Next.js em `localhost:3000`

Ao iniciar, a API executa `prisma migrate deploy` e sobe o Nest em modo production. Seed nao roda automaticamente no container para evitar criacao acidental de usuarios conhecidos.

Para um compose mais proximo de producao:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up --build
```

No compose de producao, MySQL, Redis, API e worker nao publicam portas para fora da rede Docker; apenas o `web` e exposto. As variaveis sensiveis sao obrigatorias via ambiente.

## Prisma Migrate

Use migrations quando alterar os models:

```bash
pnpm db:migrate -- --name nome_da_mudanca
```

Para aplicar migrations ja criadas, como no Docker:

```bash
pnpm db:migrate:deploy
```

`db:push` continua disponivel para prototipos rapidos, mas o fluxo recomendado e versionar migrations em `apps/api/prisma/migrations`.

## Acesso local

- Web: http://localhost:3000
- API: http://localhost:3333
- Seed local: configure `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`, rode `pnpm db:seed` e use esses dados para entrar.

## Variaveis

Veja `apps/api/.env.example` e `apps/web/.env.example`.

Principais variaveis da API:

- `DATABASE_URL`: conexao MySQL.
- `INTERNAL_API_KEY`: chave interna exigida pelo Nest quando configurada.
- `API_INTERNAL_KEY`: mesma chave no Next, enviada pelo proxy server-side.
- `ONBOARDING_JWT_SECRET`: assinatura dos links de onboarding.
- `FISCAL_CREDENTIALS_ENCRYPTION_KEY`: chave-mestre para criptografar credenciais fiscais por tenant.
- `NFEIO_BASE_URL`: URL base do provider fiscal.
- `REDIS_HOST` e `REDIS_PORT`: conexao com Redis/BullMQ.
- `FISCAL_QUEUE_ATTEMPTS`, `FISCAL_QUEUE_BACKOFF_MS` e `FISCAL_QUEUE_CONCURRENCY`: tentativas, backoff e concorrencia do worker fiscal.

## Onboarding por token

O fluxo esperado para o gateway de pagamento e:

1. Webhook confirma pagamento.
2. Backend do pagamento cria ou garante o `User`.
3. Gateway gera um JWT com `sub = user.id` e `purpose = tenant_onboarding`.
4. Cliente recebe a URL `/onboarding?token=...`.
5. O ERP valida o token, abre o formulario do tenant e cria `TenantTitular` como `OWNER`.

Para simular localmente:

```bash
pnpm onboarding:token -- --email "$SEED_ADMIN_EMAIL"
```

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Integracao fiscal](docs/fiscal-integration.md)
- [Hardening de seguranca](docs/security-hardening.md)
