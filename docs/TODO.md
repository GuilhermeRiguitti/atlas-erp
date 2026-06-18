# Proximas revisoes

## Proximo passo imediato (handoff para a sessao WSL2)

Estado: a auditoria de seguranca ja corrigiu IDOR/escopo por tenant, escalada de
privilegio, validacao de certificado A1 no upload, e limpou vestigios de portfolio
(UserRole/UserProfile). Os dois proximos itens, ainda PENDENTES, sao:

1. Rate limiting no login e onboarding (anti brute-force).
   - Login: `apps/api/src/modules/auth` (`POST /auth/login`). Onboarding: `apps/api/src/modules/onboarding`.
   - Hoje nao ha nenhum limitador. Sugestao: `@nestjs/throttler` (limite por IP) ou guard proprio; aplicar tambem nas rotas do BFF (`apps/web/src/app/api/auth/login`).
   - Cuidado: mensagens de erro de login ja sao genericas ("Invalid credentials"); manter assim para nao facilitar enumeracao de usuarios.

2. Validacao de CNPJ/CPF com digito verificador.
   - Hoje o codigo so faz `replace(/\D/g, '')` (nao valida DV).
   - Emitente: `tenant.cnpj`. Tomador/cliente: `invoice.borrowerDocument`, `client.document`.
   - Sugestao: util/decorator compartilhado validando DV e aplicado nos DTOs `create-tenant`, `update-tenant`, `create-client`, `update-client`, `create-service-invoice`, e no onboarding.

## Seguranca

- Revisar RBAC por tenant antes de producao.
- Adicionar rate limit para login e onboarding.
- Trocar `FISCAL_CREDENTIALS_ENCRYPTION_KEY` local por KMS/cofre externo.
- Criar webhook seguro do gateway de pagamento com assinatura e idempotencia.
- Criar webhook fiscal do provider com verificacao de origem e idempotencia.

> Contexto: o projeto guarda dados sensiveis de empresas (dados cadastrais, documentos
> de tomadores e, sobretudo, o certificado A1 de cada tenant). O A1 e a identidade
> digital da empresa: vazamento permite emitir/assinar documentos no nome dela. O
> nivel de protecao deve ser proporcional a isso. Itens marcados [LEGAL] exigem
> revisao de advogado/contador; o checklist tecnico nao substitui parecer juridico.

## Seguranca de certificados e segredos (prioridade alta)

- Substituir a chave-mestre unica local por KMS/cofre externo (AWS KMS, GCP KMS, Vault) com envelope encryption por tenant.
- Rotacao de chave-mestre e re-criptografia dos segredos sem downtime.
- Garantir que PFX e senha descriptografados NUNCA sejam logados, gravados em disco ou serializados em resposta de API; limpar da memoria apos uso quando possivel.
- Registrar evento de auditoria a cada descriptografia/uso de certificado (quem, quando, qual tenant, qual nota).
- [FEITO] Validacao do certificado no upload: `CertificateValidatorService` confirma que o PFX abre com a senha, esta na validade e que o CNPJ bate com o tenant (bloqueia certificado errado/vencido/de terceiros). Testes em `certificate-validator.service.spec.ts`.
- Alertar antes do vencimento do certificado A1 de cada tenant (usar o `notAfter` ja extraido na validacao).

## Isolamento multi-tenant (prioridade alta)

- [FEITO] IDOR corrigido: identidade autenticada propagada do BFF para a API (`x-user-id`/`x-user-role`) e `TenantAccessService` valida acesso por tenant em tenants, clients, invoices (incl. status/cancel) e fiscal-credentials.
- [FEITO] Escalada de privilegio bloqueada: rotas de users restritas (criar/listar/remover = admin; ver/editar = proprio ou admin) e mudanca de `role`/`status` so por admin; profile so do proprio usuario.
- [FEITO] Listagem de tenants escopada as associacoes do usuario (admin ve todos).
- [FEITO] Testes de autorizacao em `tenant-access.service.spec.ts`.
- Pendente: autenticar cada requisicao na API com JWT proprio (hoje a API confia no header propagado atras do internal key; a API nunca deve ficar exposta).
- Pendente: RBAC fino por papel de titular (OWNER vs ACCOUNTANT) para quem pode emitir/cancelar/ver credenciais; hoje a base e associacao ao tenant.
- Pendente: revisar consultas de outros modulos para garantir escopo por tenant em buscas futuras.

## Validacao e integridade de dados

- Validacao de CNPJ/CPF com digito verificador (emitente e tomador).
- Validar consistencia fiscal antes de enfileirar (aliquota, codigos de servico, competencia).
- Idempotencia de emissao (evitar nota duplicada em retry/clique duplo); hoje ha `jobId` por invoice, revisar cobertura.
- Constraints no banco e tratamento de concorrencia para `nDPS`/serie por tenant.
- Checagem de integridade/backup dos dados fiscais (notas tem valor legal e retencao obrigatoria).

## Testes e CI (guardrails para o desenvolvimento)

> Como o desenvolvimento usa IA com frequencia, os testes automatizados sao a rede
> de seguranca contra regressoes introduzidas sem revisao manual completa.

- Unit: crypto (encrypt/decrypt round-trip), DpsBuilder, DpsSigner, validacao de CNPJ/CPF.
- Integracao: endpoints com autenticacao + escopo de tenant (incluindo casos negativos de IDOR/RBAC).
- Regressao de seguranca: testes que falham se um endpoint deixar de checar ownership.
- Pipeline CI rodando typecheck + lint + testes + `pnpm audit` + scan de segredos a cada push, bloqueando merge em falha.
- Cobertura minima definida para os modulos fiscais e de credenciais.

## LGPD e privacidade

- Mapear dados pessoais tratados (CPF de tomadores PF, e-mails, enderecos) e base legal de cada tratamento. [LEGAL]
- Definir papeis: a plataforma e operadora dos dados que o tenant insere e controladora dos dados de conta do tenant. [LEGAL]
- Politica de retencao e descarte, conciliando direito de exclusao do titular com a obrigacao fiscal de guardar notas (~5 anos). [LEGAL]
- Atender direitos do titular (acesso, correcao, exclusao, portabilidade) com processo definido.
- Plano de resposta a incidente/vazamento com notificacao a ANPD e afetados. [LEGAL]
- Designar encarregado (DPO) e manter registro das atividades de tratamento (ROPA). [LEGAL]
- Criptografia em repouso (ja ha AES-256-GCM nos segredos) e em transito (TLS) documentadas; expandir auditoria com IP/user-agent.
- Listar sub-operadores (hospedagem, banco, Redis, e-mail) e disponibilizar para os tenants.

## Contratos e juridico [LEGAL]

- Termos de Uso e Politica de Privacidade publicos.
- Contrato/DPA de tratamento de dados entre a plataforma e cada tenant.
- Clausula de responsabilidade fiscal: o tenant e o emitente responsavel pela nota; a plataforma e a ferramenta.
- Clausula autorizando o armazenamento e uso do certificado A1 exclusivamente para emissao em nome do tenant.
- SLA, limitacao de responsabilidade, e processo de offboarding (devolucao/exclusao de dados).

## Backups e continuidade

- Backups automaticos e criptografados do MySQL, com teste de restauracao.
- Plano de disaster recovery (RPO/RTO definidos).
- Monitoramento e alerta de comportamento anomalo (picos de emissao, descriptografias fora do padrao).

## Documentacao desatualizada

- `docs/security-hardening.md` ainda descreve o provider `MOCK` removido e `ALLOW_MOCK_FISCAL_PROVIDER`; atualizar para refletir `NFSE_NACIONAL` + `NFSE_NACIONAL_MODE`.

## Revisao da evolucao single-tenant -> multi-tenant (divida arquitetural)

> Contexto: o projeto nasceu single-tenant (uma unica empresa) como um open source
> basico, herdado de uma base de portfolio. Evoluiu para SaaS multi-tenant. Boa
> parte das falhas de seguranca (IDOR/escopo) surgiu justamente porque rotas e
> modelos escritos para "uma empresa, um usuario" passaram a operar com varios
> tenants sem revisao completa. Esta secao guia uma revisao manual sistematica,
> arquivo por arquivo, procurando suposicoes do mundo single-tenant que sobraram.

### Vestigios da fase portfolio/single-tenant a decidir

- [FEITO] `UserRole` agora e `ADMIN`/`MEMBER` (removido `RECRUITER`). Papel de plataforma; papeis de negocio ficam em `TenantTitularRole`.
- [FEITO] `UserProfile` repurposado de CV de portfolio para perfil de operador de ERP (`phone`, `jobTitle`, `department`, `avatarUrl`, `locale`, `timezone`, todos opcionais). Tipo no web renomeado de `TalentProfile` para `UserProfile`. Migracao `20260618000000_erp_user_profile_and_roles`.
- `role` global de usuario (ADMIN/MEMBER) hoje dirige a autorizacao da plataforma, mas nao e por tenant. O papel por tenant existe (`TenantTitularRole`) mas ainda nao governa permissoes. Definir o modelo de papeis definitivo.
- Pendente aplicar a migracao no banco (`prisma migrate deploy`) e rodar `prisma generate` limpo quando nenhum dev server estiver segurando o engine (deu EPERM no binario; os tipos ja foram regenerados).

### Checklist de revisao manual (codigo a destrinchar em conjunto)

- Rotas/handlers do BFF (`apps/web/src/app/api/**`): confirmar que toda rota faz autenticacao E que o recurso e escopado ao tenant do usuario (algumas so foram corrigidas agora; revisar caso a caso).
- Servicos da API (`apps/api/src/modules/**/application/*.service.ts`): procurar consultas Prisma sem `tenantId` no `where` que assumem "existe so uma empresa".
- Buscas por `findUnique`/`findFirst` por `id` sem checar tenant antes de retornar dado sensivel.
- Fluxo de onboarding e criacao de usuarios: como um `User` e criado e quem pode minta o token de onboarding (`ONBOARDING_JWT_SECRET`); confirmar que nao ha auto-registro indevido.
- Seed (`prisma/seed.ts`) e dados de exemplo: remover qualquer dado/papel herdado do portfolio.
- Enums e modelos: marcar tudo que so fazia sentido single-tenant/portfolio e planejar migracao.
- Naming herdado (ex.: `atlas`, `RECRUITER`) que confunde o dominio atual.

> Como conduzir: revisar em conjunto, modulo a modulo, anotando aqui cada ponto
> single-tenant encontrado antes de corrigir, para nao reintroduzir regressao.

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
