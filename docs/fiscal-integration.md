# Integracao fiscal de NFS-e

## Decisao tecnica

A emissao de nota fiscal de servico foi desenhada com adapter de provider. Hoje existem dois caminhos:

- `NFE_IO`: adapter para a API paga da NFE.io, autenticada por apiKey criptografada por tenant.
- `NFSE_NACIONAL`: emissao nativa pelo Sistema Nacional NFS-e da Receita Federal (SEFIN/ADN), sem intermediario pago.

Essa separacao evita acoplar o ERP a um fornecedor fiscal antes de validar municipio, certificado, regime tributario, custo e suporte.

## Emissao nativa: NFS-e Nacional (provider padrao do projeto)

A partir de 2026 o municipio de Muriae/MG (e a maioria do Brasil) desativou o emissor municipal e passou a usar exclusivamente o Emissor Nacional da Receita Federal. MEIs ja eram obrigados ao padrao nacional desde 2023. Por isso o ERP integra direto com a API Nacional, sem custo de intermediario.

Existem dois acessos a NFS-e Nacional:

- Portal/app Emissor Nacional (login gov.br): emissao manual, gratuita, sem certificado. Nao serve para integracao via codigo.
- API REST SEFIN/ADN: integracao programatica usada pelo ERP. Exige certificado A1 ICP-Brasil (mTLS). O certificado e o unico custo (~R$100-150/ano) e nao tem alternativa gratuita para emissao automatizada.

### Modos do adapter (`NFSE_NACIONAL_MODE`)

- `mock` (padrao): monta a DPS real, mas substitui assinatura e rede por uma resposta fiel ao contrato (chave de acesso de 50 digitos, XML simulado, status `AUTHORIZED`). Permite demonstrar a emissao nativa ponta a ponta sem certificado e sem homologacao.
- `producao_restrita`: ambiente oficial de homologacao da Receita. Exige certificado A1 configurado no tenant.
- `producao`: emissao real.

Para ativar a emissao real basta configurar o certificado no tenant e trocar `NFSE_NACIONAL_MODE` para `producao_restrita` ou `producao`. O codigo de montagem da DPS e o mesmo nos tres modos.

### Contrato da API Nacional (SEFIN/ADN)

- `POST /nfse`: recebe a DPS assinada (XMLDSIG) em GZip+Base64 e gera a NFS-e (sincrono).
- `GET /nfse/{chaveAcesso}`: retorna o XML autorizado (GZip+Base64).
- `GET /dps/{id}` e `HEAD /dps/{id}`: consulta da DPS.
- `POST /nfse/{chaveAcesso}/eventos`: eventos como cancelamento.
- Autenticacao: mTLS com certificado ICP-Brasil A1/A3 (o certificado e a credencial; nao ha apiKey).

### Endpoints do ERP

- `POST /service-invoices`: cria a nota e enfileira a emissao.
- `POST /service-invoices/:id/cancel`: cancela uma nota autorizada/processando (body `{ reason }`). No padrao nacional gera evento `101101` assinado em `POST /nfse/{chave}/eventos`.
- `GET /service-invoices/:id/status`: consulta o status atual no provider e atualiza o banco.

O cancelamento e a consulta sao operacoes opcionais da interface `FiscalProviderClient`; o adapter NFS-e Nacional implementa ambas (NFE.io ainda nao). No modo mock as duas operam sem certificado nem rede.

### Fluxo interno do provider

1. `DpsBuilder` monta a DPS (XML, namespace `http://www.sped.fazenda.gov.br/nfse`) a partir do tenant e da nota.
2. `DpsSigner` assina a DPS com XMLDSIG usando o PFX do tenant (lazy-load de `node-forge`/`xml-crypto`; pulado no modo mock).
3. A DPS assinada e compactada (GZip) e codificada em Base64 e enviada via `POST /nfse` por mTLS.
4. A resposta traz a chave de acesso de 50 digitos, salva em `providerExternalId`, e o XML autorizado.

### Certificado A1 do tenant

O PFX (.pfx em base64) e a senha sao enviados em `PUT /tenants/:id/fiscal-credentials` e ficam criptografados em repouso (AES-256-GCM) nos campos `encryptedCertificatePfx` e `encryptedCertificatePassword`. Para emissao real, configure no tenant:

- `fiscalProvider = NFSE_NACIONAL`
- `certificatePfxBase64` e `certificatePassword` na credencial
- `NFSE_NACIONAL_MODE` e `NFSE_NACIONAL_BASE_URL` no ambiente

## Provedores avaliados

NFE.io possui documentacao REST para Nota Fiscal de Servico e recursos ligados a empresas, tomadores, notas e webhooks. Fonte: [documentacao NFE.io NFS-e](https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/).

Focus NFe tambem e um provider conhecido no Brasil. A documentacao da API v2 informa suporte a NFe, NFSe e NFCe, com comunicacao com SEFAZ ou prefeituras. A emissao de NFSe costuma depender de processamento assincrono: a nota aceita entra em fila e depois deve ser consultada ou acompanhada por webhook. Fontes: [docs Focus NFe](https://focusnfe.com.br/doc/) e [emitir NFSe](https://doc.focusnfe.com.br/reference/emitir_nfse).

## Fluxo recomendado

1. Cadastrar `Tenant` com dados fiscais completos.
2. Vincular pelo menos um `TenantTitular` com `canIssueInvoices = true`.
3. Cadastrar `Client` como tomador do servico.
4. Configurar provider fiscal e credenciais criptografadas no tenant.
5. Criar nota em `ServiceInvoice`, preferencialmente com `clientId`.
6. Preencher dados do tomador a partir do cliente selecionado.
7. Salvar a nota como `QUEUED` e publicar o job `issue-service-invoice` no BullMQ.
8. Worker fiscal consome o job, envia payload ao provider e aplica retry/backoff em falhas temporarias.
9. Salvar `providerPayload`, `providerResponse` e `FiscalAuditEvent`.
10. Atualizar status por resposta imediata, consulta ou webhook.
11. Disponibilizar XML/PDF/URL quando autorizado pelo provider.

## Status internos

- `DRAFT`: criado sem envio.
- `QUEUED`: salvo e aguardando processamento pelo worker fiscal.
- `PROCESSING`: aceito pelo provider e aguardando prefeitura.
- `AUTHORIZED`: autorizado.
- `REJECTED`: rejeitado pelo provider ou prefeitura.
- `FAILED_RETRYING`: falha temporaria; BullMQ ainda pode tentar novamente.
- `FAILED_FINAL`: falha apos todas as tentativas configuradas.
- `CANCELLED`: cancelado.

## Fila e worker

A emissao fiscal roda em background com Redis/BullMQ. A API salva a solicitacao no MySQL antes de publicar o job, e o worker recupera notas pendentes ao iniciar para reduzir risco operacional quando Redis ou worker forem reiniciados.

Variaveis principais:

```env
REDIS_HOST="localhost"
REDIS_PORT=6379
FISCAL_QUEUE_ATTEMPTS=5
FISCAL_QUEUE_BACKOFF_MS=30000
FISCAL_QUEUE_CONCURRENCY=2
```

O MySQL continua sendo a fonte da verdade. Redis e a fila operacional: retries, backoff e concorrencia ficam no BullMQ; status fiscal, payloads e auditoria ficam no banco.

## Configuracao segura

```env
NFEIO_BASE_URL="https://api.nfe.io"
FISCAL_CREDENTIALS_ENCRYPTION_KEY="chave-longa-para-criptografia"
```

Para usar NFE.io em um tenant, configure no cadastro fiscal do tenant:

- `fiscalProvider = NFE_IO`
- credencial em `TenantFiscalCredential`
- `providerCompanyId` com o ID da empresa no provider
- `apiKey` criptografada em repouso com AES-256-GCM

A chave real de API do provider nao deve ficar em `.env` porque cada tenant pode ter uma credencial diferente. O `.env` guarda apenas a chave-mestre `FISCAL_CREDENTIALS_ENCRYPTION_KEY`, usada pela API para criptografar e descriptografar os segredos antes da chamada ao provider.

Endpoints atuais para credenciais fiscais:

- `GET /tenants/:id/fiscal-credentials`: lista credenciais sem retornar segredos.
- `PUT /tenants/:id/fiscal-credentials`: cria ou atualiza a credencial do provider para o tenant.

O adapter da NFE.io ja usa a credencial ativa do tenant durante a emissao. A integracao ainda precisa de credenciais reais, homologacao do municipio e webhook de retorno para ser considerada pronta para producao.

## Pendencias antes de producao

- Webhook de retorno do provider.
- Cancelamento/substituicao de NFS-e.
- Download seguro de XML/PDF.
- Expandir auditoria com IP, user-agent e rastreio de alteracao de credenciais fiscais.
- RBAC por tenant.
- Validacao de CNPJ/CPF com digito verificador.
- Cofre externo ou KMS para substituir a chave-mestre local quando o sistema for para producao.
- Revisao contabil por municipio e atividade.
