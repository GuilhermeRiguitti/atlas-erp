FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

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
CMD ["sh", "-c", "pnpm --filter api prisma:migrate:deploy && pnpm --filter api prisma:seed && pnpm --filter api start:prod"]

FROM runner AS web
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
