# Integração fiscal de NFS-e

## Decisão técnica

A emissão de nota fiscal de serviço foi desenhada com adapter de provider. Hoje existem dois caminhos:

- `MOCK`: provider local para desenvolvimento e portfolio.
- `NFE_IO`: adapter inicial para NFE.io, configurado por variaveis de ambiente.

Essa separacao evita acoplar o ERP a um fornecedor fiscal antes de validar municipio, certificado, regime tributario, custo e suporte.

## Provedores avaliados

NFE.io possui documentacao REST para Nota Fiscal de Serviço e recursos ligados a empresas, tomadores, notas e webhooks. Fonte: [documentacao NFE.io NFS-e](https://nfe.io/docs/desenvolvedores/rest-api/nota-fiscal-de-servico-v1/).

Focus NFe tambem e um provider conhecido no Brasil. A documentacao da API v2 informa suporte a NFe, NFSe e NFCe, com comunicacao com SEFAZ ou prefeituras. A emissao de NFSe e assíncrona: a nota aceita entra em fila e depois deve ser consultada ou acompanhada por webhook. Fontes: [docs Focus NFe](https://focusnfe.com.br/doc/) e [emitir NFSe](https://doc.focusnfe.com.br/reference/emitir_nfse).

## Fluxo recomendado

1. Cadastrar `Tenant` com dados fiscais completos.
2. Vincular pelo menos um `TenantTitular` com `canIssueInvoices = true`.
3. Cadastrar `Client` como tomador do servico.
4. Configurar provider fiscal no tenant.
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

## Variaveis

```env
NFEIO_BASE_URL="https://api.nfe.io"
NFEIO_INVOICE_KEY=""
```

Para usar NFE.io em um tenant, configure:

- `fiscalProvider = NFE_IO`
- `fiscalProviderCompanyId` com o ID da empresa no provider
- `NFEIO_INVOICE_KEY` no ambiente da API

## Pendencias antes de producao

- Webhook de retorno do provider.
- Cancelamento/substituicao de NFS-e.
- Download seguro de XML/PDF.
- Auditoria de emissao por usuario e IP.
- RBAC por tenant.
- Validacao de CNPJ/CPF com digito verificador.
- Criptografia ou cofre externo para certificados e tokens sensiveis.
- Revisao contabil por municipio e atividade.
