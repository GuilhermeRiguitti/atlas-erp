# Hardening de seguranca

## Escopo atual

Este projeto deixou de ser uma demo de portfolio e passou a ser tratado como base de SaaS fiscal multi-tenant. O objetivo deste documento e registrar decisoes de seguranca que evitam expor banco, API interna, credenciais fiscais ou usuarios seed.

## Docker

- `docker-compose.yml` e para desenvolvimento local.
- MySQL fica publicado apenas em `127.0.0.1:3306`.
- Redis fica publicado apenas em `127.0.0.1:6379` no compose de desenvolvimento.
- API fica publicada apenas em `127.0.0.1:3333`.
- `docker-compose.prod.yml` nao publica MySQL, Redis, API nem worker; apenas o `web` fica exposto.
- `.env.production.example` documenta as variaveis obrigatorias para o compose de producao.
- `.dockerignore` impede que `.env`, `.env.local`, builds locais, `node_modules` e artefatos entrem na imagem.
- O container da API nao roda `prisma:seed` automaticamente.

## Banco

A imagem oficial do MySQL concede automaticamente `ALL PRIVILEGES` ao usuario definido em `MYSQL_USER` sobre o banco definido em `MYSQL_DATABASE`, sem necessidade de script adicional. O scope e limitado a `atlas_users.*`, nao usa `*.*` nem `WITH GRANT OPTION`.

## API interna

Quando `INTERNAL_API_KEY` esta configurada no Nest, toda rota da API, exceto healthcheck `/`, exige o header:

```txt
x-internal-api-key: <valor>
```

O Next envia esse header usando `API_INTERNAL_KEY`. Isso reduz o risco de alguem usar a API Nest diretamente quando a porta estiver acessivel. Em producao, a API tambem deve ficar sem porta publica.

## Sessoes

- `IRON_SESSION_PASSWORD` e obrigatorio em producao.
- A senha precisa ter pelo menos 32 caracteres.
- O cookie usa `httpOnly`, `sameSite=lax` e `secure` em producao.

## Seed

- Seed e apenas para desenvolvimento local.
- `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` sao obrigatorios.
- Em `NODE_ENV=production`, o seed recusa execucao, exceto se `ALLOW_PRODUCTION_SEED=true` for definido de forma explicita.

## Credenciais fiscais

- Chaves reais de provider fiscal nao ficam em variaveis de ambiente por tenant.
- `TenantFiscalCredential` guarda credenciais por tenant/provider.
- Segredos sao criptografados em repouso com AES-256-GCM.
- `FISCAL_CREDENTIALS_ENCRYPTION_KEY` e a chave-mestre atual e deve ser substituida por KMS/cofre externo em producao.

## Mock fiscal

O provider `MOCK` existe para desenvolvimento. A emissao fake so funciona quando:

```env
ALLOW_MOCK_FISCAL_PROVIDER="true"
```

Em producao, mantenha esse valor ausente ou `false`.

## Fila fiscal

- Redis/BullMQ processa emissao fiscal em background.
- O Redis nao deve ter porta publica em producao.
- O worker fiscal roda como processo separado da API HTTP.
- Jobs usam retry/backoff e `jobId` por `ServiceInvoice.id` para reduzir duplicidade.
- Status, payloads e auditoria ficam no MySQL; a fila nao substitui persistencia de negocio.
