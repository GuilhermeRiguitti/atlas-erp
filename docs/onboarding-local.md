# Onboarding local (sem gateway de pagamento)

## Pre-requisitos

Configure o `.env` em `apps/api/` com pelo menos:

```env
SEED_ADMIN_EMAIL=admin@exemplo.com
SEED_ADMIN_PASSWORD=suasenha
ONBOARDING_JWT_SECRET=qualquer-string-secreta
DATABASE_URL=mysql://...
```

---

## Passo a passo

```bash
# 1. Sobe MySQL e Redis
pnpm docker:infra

# 2. Aplica as migrations
pnpm db:migrate:deploy

# 3. Cria o usuario admin, o tenant demo e imprime a URL de onboarding
pnpm db:seed

# 4. Sobe a API e o frontend
pnpm dev
```

O passo 3 imprime a URL diretamente no terminal:

```
--- Onboarding URL (valido por 7 dias) ---
http://localhost:3000/onboarding?token=eyJ...
------------------------------------------
```

Abra a URL no browser, preencha os dados da empresa e submeta. Isso cria o `Tenant` e vincula o usuario como `OWNER`.

---

## O que o seed cria

- Um `User` com role `ADMIN` e status `ACTIVE` usando `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`

## O que o token de onboarding faz

- JWT assinado com `ONBOARDING_JWT_SECRET`, valido por 7 dias
- Carrega `sub = user.id` e `purpose = tenant_onboarding`
- O formulario valida o token antes de exibir e antes de salvar

## O que o onboarding cria

- `Tenant` com os dados da empresa (CNPJ unico)
- `TenantTitular` vinculando o usuario ao tenant com role `OWNER`
- Se o usuario estava com status `INVITED`, passa para `ACTIVE`

---

## No fluxo real (com gateway)

O gateway substituiria os passos 3 e 5: ele criaria o `User` via API interna e geraria o token JWT, entregando a URL diretamente ao cliente apos a confirmacao do pagamento.
