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
- `profiles`: perfil operacional do usuario (cargo, departamento, contato, locale/timezone)
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
```

## Docker

Tres arquivos compose, por finalidade:

- `docker-compose.dev.yml`: desenvolvimento em containers com hot reload (bind mount do codigo). Um container por servico (`mysql`, `redis`, `migrate`, `api`, `worker`, `web`), mesma topologia da producao. `node_modules` ficam em volumes nomeados para nao misturar binarios do host com os do container.
- `docker-compose.yml`: variante local baseada em imagem buildada (sem hot reload). MySQL e API publicados apenas em `127.0.0.1`.
- `docker-compose.prod.yml`: producao (ex.: Oracle), sem publicar portas para fora da rede Docker, exceto o `web`.

### Dev em containers (recomendado no WSL2)

```bash
pnpm dev:up      # sobe tudo com build e hot reload
pnpm dev:logs    # acompanha os logs
pnpm dev:down    # derruba os containers
pnpm dev:migrate # one-shot: generate + migrate deploy + seed
pnpm dev:reset   # derruba e apaga os volumes (banco zerado)
```

O servico `migrate` roda uma vez (generate + migrate deploy + seed) e a API so sobe depois que ele termina com sucesso, evitando crash-loop por erro de seed.

### Dev com Node no host (alternativa)

```bash
pnpm docker:infra      # sobe apenas mysql e redis
pnpm db:migrate:deploy
pnpm dev               # api + web + worker em paralelo
```

```bash
pnpm docker:up     # docker compose up --build
pnpm docker:down   # derruba os containers
pnpm docker:logs   # acompanha os logs
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

Para simular localmente, rode o seed: ele cria o admin e imprime no console uma URL de onboarding valida por 7 dias.

```bash
pnpm db:seed
```

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Integracao fiscal](docs/fiscal-integration.md)
- [Hardening de seguranca](docs/security-hardening.md)
