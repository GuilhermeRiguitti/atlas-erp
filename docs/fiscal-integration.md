# Integração fiscal de NFS-e

## Decisão técnica

A emissão de nota fiscal de serviço foi desenhada com adapter de provider. Hoje existem dois caminhos:

- `MOCK`: provider local para desenvolvimento e testes sem envio real.
- `NFE_IO`: adapter inicial para NFE.io, configurado por credenciais criptografadas por tenant.

Essa separacao evita acoplar o ERP a um fornecedor fiscal antes de validar municipio, certificado, regime tributario, custo e suporte.

## Provedores avaliados

NFE.io possui documentacao REST para Nota Fiscal de Serviço e recursos ligados a empresas, tomadores, notas e webhooks. Fonte: [documentacao NFE.io NFS-e](https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/).

Focus NFe tambem e um provider conhecido no Brasil. A documentacao da API v2 informa suporte a NFe, NFSe e NFCe, com comunicacao com SEFAZ ou prefeituras. A emissao de NFSe e assíncrona: a nota aceita entra em fila e depois deve ser consultada ou acompanhada por webhook. Fontes: [docs Focus NFe](https://focusnfe.com.br/doc/) e [emitir NFSe](https://doc.focusnfe.com.br/reference/emitir_nfse).

## Fluxo recomendado

1. Cadastrar `Tenant` com dados fiscais completos.
2. Vincular pelo menos um `TenantTitular` com `canIssueInvoices = true`.
3. Cadastrar `Client` como tomador do servico.
4. Configurar provider fiscal e credenciais criptografadas no tenant.
5. Criar nota em `ServiceInvoice`, preferencialmente com `clientId`.
6. Preencher dados do tomador a partir do cliente selecionado.
7. Enviar payload ao provider.
8. Salvar `providerPayload` e `providerResponse`.
9. Atualizar status por consulta ou webhook.
10. Disponibilizar XML/PDF/URL quando autorizado pelo provider.

## Status internos

- `DRAFT`: criado sem envio.
- `PROCESSING`: aceito pelo provider e aguardando prefeitura.
- `AUTHORIZED`: autorizado.
- `REJECTED`: rejeitado pelo provider ou prefeitura.
- `CANCELLED`: cancelado.

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
- Auditoria de emissao por usuario e IP.
- RBAC por tenant.
- Validacao de CNPJ/CPF com digito verificador.
- Cofre externo ou KMS para substituir a chave-mestre local quando o sistema for para producao.
- Revisao contabil por municipio e atividade.
