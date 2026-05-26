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
- Proximo passo: criar outbox transacional se o sistema passar a depender de entrega garantida entre MySQL e Redis em alto volume.

## Banco e Docker

- MySQL, Redis e API no compose local estao publicados apenas em `127.0.0.1`.
- Para producao, usar `docker-compose.prod.yml`, que nao publica MySQL, Redis nem API.

Observacao: se um volume MySQL local ja existia antes da correcao do grant, o script de init nao roda novamente. Recrie o volume local ou ajuste as permissoes manualmente.
