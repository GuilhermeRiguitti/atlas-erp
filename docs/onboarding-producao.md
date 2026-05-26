# Onboarding em producao

## 1. Configurar variaveis de ambiente

Copie o exemplo e preencha todos os valores:

```bash
cp .env.production.example .env.production
```

Edite `.env.production`:

```env
MYSQL_DATABASE=atlas_users
MYSQL_USER=atlas_app
MYSQL_PASSWORD=<senha forte aleatoria>
MYSQL_ROOT_PASSWORD=<senha root aleatoria>

DATABASE_URL=mysql://atlas_app:<MYSQL_PASSWORD>@mysql:3306/atlas_users
WEB_ORIGIN=https://app.seudominio.com
WEB_PORT=3000

INTERNAL_API_KEY=<string longa aleatoria>
ONBOARDING_JWT_SECRET=<string longa aleatoria>
FISCAL_CREDENTIALS_ENCRYPTION_KEY=<string longa aleatoria>
NFEIO_BASE_URL=https://api.nfe.io

IRON_SESSION_PASSWORD=<string longa aleatoria - minimo 32 chars>
NEXT_PUBLIC_APP_NAME=ERP Fiscal

FISCAL_QUEUE_ATTEMPTS=5
FISCAL_QUEUE_BACKOFF_MS=30000
FISCAL_QUEUE_CONCURRENCY=2
```

> Gere os valores aleatorios com: `openssl rand -base64 48`

---

## 2. Subir os containers

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

O container `api` ja roda `prisma migrate deploy` automaticamente na inicializacao. Nao e necessario rodar migrations manualmente.

Servicos expostos:
- **Web**: `http://servidor:3000` (ou a porta definida em `WEB_PORT`)
- MySQL, Redis e API ficam dentro da rede Docker, sem portas expostas para fora.

---

## 3. Criar o primeiro usuario admin

O seed **nao roda automaticamente** em producao. Crie o usuario diretamente pelo banco ou rode o seed uma unica vez com a variavel de permissao:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec api sh -c "SEED_ADMIN_EMAIL=admin@seudominio.com SEED_ADMIN_PASSWORD=<senha> ALLOW_PRODUCTION_SEED=true node dist/prisma/seed.js"
```

---

## 4. Gerar o link de onboarding

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec api sh -c "WEB_ORIGIN=https://app.seudominio.com node dist/scripts/create-onboarding-token.js --email=admin@seudominio.com"
```

Isso imprime a URL completa. Acesse no browser, preencha os dados da empresa e submeta.

---

## O que o onboarding cria

- `Tenant` com os dados da empresa (CNPJ unico)
- `TenantTitular` vinculando o usuario ao tenant com role `OWNER`

---

## Observacoes importantes

- **Seed em producao e bloqueado por padrao.** Exige `ALLOW_PRODUCTION_SEED=true` explicitamente.
- **`FISCAL_CREDENTIALS_ENCRYPTION_KEY` nao pode ser trocada** depois que credenciais fiscais ja foram salvas no banco, pois os dados ficam criptografados com ela. Guarde em um cofre (KMS ou Vault) antes de ir para producao.
- **Volume MySQL**: se o volume ja existia antes de alterar `MYSQL_USER`/`MYSQL_PASSWORD`, o script de init do MySQL nao roda novamente. Recriar o volume (`docker volume rm`) apaga todos os dados.
- **`ALLOW_MOCK_FISCAL_PROVIDER`** esta fixado como `"false"` no compose de producao — emissao real sempre.
