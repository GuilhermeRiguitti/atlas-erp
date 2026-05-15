# Atlas Users Suite

Monorepo de mini ERP fiscal com empresas emissoras, clientes, titulares, usuarios, emissao de NFS-e, backend NestJS, frontend Next.js, sessoes com iron-session, consumo via SWR/mutate e Prisma ORM.

## Stack

- `apps/api`: NestJS, Prisma, MySQL, class-validator, bcryptjs
- `apps/web`: Next.js App Router, iron-session, SWR, Tailwind CSS, lucide-react
- `pnpm workspaces`: scripts raiz para dev, build, lint, test e banco

## Modulos

- `auth`: login no Nest; sessao persistida no Next com iron-session
- `tenants`: empresas emissoras com dados fiscais, CNPJ, inscricoes, endereco e provider fiscal
- `tenant titulares`: vinculo entre empresa e usuario titular
- `clients`: clientes/tomadores vinculados ao tenant, com auditoria de usuario criador
- `service invoices`: emissao e historico de NFS-e por provider fiscal
- `users`: CRUD completo de usuarios
- `profiles`: modulo ligado ao usuario para perfil profissional, skills e disponibilidade
- `prisma`: PrismaService global para acesso ao banco

## Scripts

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

Scripts separados:

```bash
pnpm dev:api
pnpm dev:web
pnpm build
pnpm lint
pnpm test
pnpm db:studio
```

## Docker

O ambiente Docker usa containers separados para `mysql`, `api` e `web`. Esse e o arranjo recomendado: o banco fica persistente em volume proprio, enquanto frontend e backend podem ser rebuildados ou reiniciados sem apagar dados.

```bash
pnpm docker:up
```

Ou diretamente:

```bash
docker compose up --build
```

Servicos:

- `mysql`: MySQL 8.4 em `localhost:3306`
- `api`: NestJS em `localhost:3333`
- `web`: Next.js em `localhost:3000`

Ao iniciar, a API executa `prisma migrate deploy`, roda o seed idempotente e sobe o Nest em modo production.

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
- Seed: `admin@atlas.dev` / `portfolio123`

## Variaveis

Veja `apps/api/.env.example` e `apps/web/.env.example`.

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Integracao fiscal](docs/fiscal-integration.md)
