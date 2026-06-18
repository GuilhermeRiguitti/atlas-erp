FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

# ---------- Dev: deps + Prisma Client; o código-fonte vem por bind mount ----------
# Imagem leve para desenvolvimento: tem node_modules instalado e o Prisma Client
# gerado, mas NAO leva o codigo-fonte embutido. Em runtime o docker-compose.dev.yml
# monta o repositorio via bind mount, entao editar no host reflete na hora (hot reload).
FROM deps AS dev
ENV NODE_ENV=development
# Copia apenas o schema do Prisma para gerar o client dentro da imagem.
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter api prisma:generate
EXPOSE 3000 3333
CMD ["pnpm", "--filter", "api", "start:dev"]

FROM deps AS builder
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./

FROM runner AS api
EXPOSE 3333
CMD ["sh", "-c", "pnpm --filter api prisma:migrate:deploy && pnpm --filter api start:prod"]

FROM runner AS web
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
