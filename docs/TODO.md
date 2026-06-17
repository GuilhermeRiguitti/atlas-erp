# Proximas revisoes

## Seguranca

- Revisar RBAC por tenant antes de producao.
- Adicionar rate limit para login e onboarding.
- Trocar `FISCAL_CREDENTIALS_ENCRYPTION_KEY` local por KMS/cofre externo.
- Criar webhook seguro do gateway de pagamento com assinatura e idempotencia.
- Criar webhook fiscal do provider com verificacao de origem e idempotencia.

## Integracoes

- Fila assincrona de emissao fiscal criada com Redis/BullMQ e worker separado.
- Eventos basicos de auditoria fiscal criados para emissao, autorizacao, rejeicao e falhas.
- Emissao nativa NFS-e Nacional (Receita Federal) criada como provider `NFSE_NACIONAL`, com DpsBuilder, DpsSigner (XMLDSIG) e modo `mock` para demonstrar sem certificado. Ver `docs/fiscal-integration.md`.
- Proximo passo: criar outbox transacional se o sistema passar a depender de entrega garantida entre MySQL e Redis em alto volume.

## NFS-e Nacional (para ir a producao real)

- Adquirir certificado A1 ICP-Brasil para o CNPJ (unico custo; nao ha alternativa gratuita para emissao via API).
- Cadastrar o PFX + senha na credencial do tenant e trocar `NFSE_NACIONAL_MODE` para `producao_restrita`.
- Homologar no ambiente de producao restrita da Receita antes de emitir em producao.
- Consulta por chave de acesso (`GET /service-invoices/:id/status`) e cancelamento (`POST /service-invoices/:id/cancel`) implementados com suporte a modo mock.
- Validar layout/XSD oficial da DPS e do evento de cancelamento contra a homologacao da Receita.
- Implementar download de XML/PDF (DANFSe).
- Gerar `nDPS` por contador transacional por tenant/serie (hoje usa timestamp).

## Banco e Docker

- MySQL, Redis e API no compose local estao publicados apenas em `127.0.0.1`.
- Para producao, usar `docker-compose.prod.yml`, que nao publica MySQL, Redis nem API.

Observacao: se um volume MySQL local ja existia antes da correcao do grant, o script de init nao roda novamente. Recrie o volume local ou ajuste as permissoes manualmente.


# Integração Fiscal para ERP (Node.js)

## Objetivo

Este documento apresenta possibilidades de integração fiscal para um ERP web desenvolvido em Node.js, com foco inicial em emissão de NFS-e para MEI e arquitetura preparada para escalar para empresas de maior porte e alto volume de emissão.

---

## Contexto

O objetivo do ERP não é atender apenas MEIs, mas evoluir para uma solução multiempresa capaz de emitir grande volume de notas fiscais.

Inicialmente, o desenvolvimento e testes podem ser feitos usando um MEI próprio e emissão via prefeitura, mas a arquitetura deve considerar crescimento futuro.

---

## O desafio da NFS-e no Brasil

A NFS-e é uma das partes mais complexas do ecossistema fiscal brasileiro.

Principais motivos:

- ausência de padronização total
- múltiplos provedores municipais
- diferenças entre prefeituras
- certificados digitais
- XML e assinatura
- homologação e manutenção constante

Cada município pode utilizar provedores diferentes, como:

- Betha
- GissOnline
- IPM
- ISSNet
- Nota Control
- entre outros

Por isso, a escolha da estratégia fiscal impacta diretamente manutenção, escalabilidade e custo do ERP.

---

# Opção 1 — NFE.io

## O que é

A NFE.io é uma plataforma de emissão fiscal via API REST voltada para software houses, SaaS e ERPs.

Site oficial:

https://nfe.io/

## Principais recursos

- emissão via API
- NFS-e
- NF-e
- NFC-e
- webhook de status
- armazenamento fiscal
- cancelamento
- documentação moderna
- boa experiência para desenvolvedores

## Vantagens

- integração rápida
- reduz complexidade fiscal
- abstrai diferenças municipais
- menos manutenção
- ideal para MVP

## Desvantagens

- custo mensal
- possível lock-in
- dependência externa
- custo pode crescer com volume

## Quando faz sentido

Boa escolha para:

- MVP
- validação rápida
- ERP SaaS em fase inicial
- time pequeno

---

# Opção 2 — Focus NFe

## O que é

A Focus NFe oferece API fiscal consolidada para emissão de documentos fiscais.

Site oficial:

https://focusnfe.com.br/

## Pontos fortes

- documentação boa
- integração REST simples
- ambiente de testes
- cobertura fiscal relevante

## Vantagens

- curva de aprendizado baixa
- boa reputação
- reduz esforço operacional

## Desvantagens

- custos recorrentes
- dependência do fornecedor

## Quando considerar

Boa alternativa para:

- MVP
- ERP SaaS
- operação inicial

---

# Opção 3 — PlugNotas / TecnoSpeed

## O que é

A PlugNotas, da TecnoSpeed, é uma das plataformas mais conhecidas para integração fiscal.

Site oficial:

https://www.plugnotas.com/

## Pontos fortes

- grande cobertura municipal
- forte presença em ERP
- múltiplos documentos fiscais

## Vantagens

- ampla cobertura
- maturidade
- suporte robusto

## Desvantagens

- pricing pode ser elevado
- integração pode ser mais extensa

## Quando considerar

Faz sentido quando:

- há foco em escala
- muitos municípios
- grande volume

---

# Opção 4 — Integração direta com prefeitura ou provedor

## O que é

Integração própria sem intermediários.

Fluxo:

ERP → Prefeitura / Provedor → XML / Nota

## Vantagens

- menor custo recorrente
- controle total
- independência

## Desvantagens

- maior complexidade
- manutenção constante
- integração municipal variável
- homologação trabalhosa

## Quando considerar

Normalmente:

- empresa madura
- time fiscal/técnico dedicado
- grande volume

---

# Arquitetura recomendada

Recomenda-se desacoplar a camada fiscal do ERP.

Provider Pattern:

```txt
ERP
 └── FiscalProvider
      ├── NFEioProvider
      ├── FocusProvider
      ├── PlugNotasProvider
      └── OwnProvider
```

Isso evita acoplamento direto com um fornecedor.

---

## Exemplo em TypeScript

```ts
interface FiscalProvider {
  issueInvoice(data: InvoiceDTO): Promise<InvoiceResult>
  cancelInvoice(id: string): Promise<void>
  getStatus(id: string): Promise<string>
}
```

---

# Multiempresa e escalabilidade

Desde o início, o ERP deve considerar multitenancy.

Modelo sugerido:

```txt
Tenant
 ├── Empresa
 ├── Certificado A1
 ├── Configuração Fiscal
 └── Notas
```

Isso facilita crescimento e evita refatorações futuras.

---

# Certificados digitais

Para empresas além de MEI, normalmente será necessário lidar com:

- certificado A1 (.pfx)
- senha
- assinatura digital
- renovação
- armazenamento seguro

Essa camada deve ser tratada como parte central do ERP.

---

# Estratégia recomendada

## Fase 1 — MVP

- emissão do próprio MEI
- API fiscal terceirizada
- validação do fluxo

Objetivo:

validar ERP rapidamente.

## Fase 2 — Escala

Após maturidade:

- manter fornecedor
ou
- desenvolver provider próprio

Objetivo:

reduzir dependência e otimizar custos.

---

# Conclusão

Para um ERP Node.js com objetivo de escalar e emitir alto volume de NFS-e, a abordagem mais equilibrada costuma ser:

1. começar com API fiscal
2. manter arquitetura desacoplada
3. preparar o sistema para múltiplos providers
4. avaliar integração própria apenas após maturidade operacional

Isso reduz tempo de desenvolvimento, acelera validação e evita reescritas futuras.
