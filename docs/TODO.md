# revisar modulo auth , iron sessions e seguranca de login

# criar testes unitarios

# integracoes funcionando mandando pra uma fila em background ou outro container (pra caso algum container cair teremos a fila armazenando asyncronamente todas as nfe ou servicos que foram solicitados durante o caimento de alguma parte da aplicacao. tanto front end , tanto back end. dessa forma todas as integracoes manteriam o funcionamento, ao menos que talvez o servico da propria fila caisse (availiar se vale a pena pois tem o risco de cair o servico da fila))


verificar seguranca abaixo:

Esse arquivo 01-grants.sql roda automaticamente quando o container MySQL é criado pela primeira vez, porque o docker-compose.yml monta ./docker/mysql/init em /docker-entrypoint-initdb.d.

Ele faz isto:

GRANT ALL PRIVILEGES ON *.* TO 'atlas'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
Ou seja: dá ao usuário atlas permissão total em todos os bancos e tabelas do MySQL, de qualquer host ('%'), e ainda permite que ele conceda permissões para outros usuários (WITH GRANT OPTION).

É seguro? Para desenvolvimento local, funciona, mas é permissivo demais. Para produção, não é seguro.

O ideal seria limitar o usuário ao banco do projeto:

GRANT ALL PRIVILEGES ON atlas_users.* TO 'atlas'@'%';
FLUSH PRIVILEGES;
E, se possível, remover WITH GRANT OPTION, porque a aplicação normalmente não precisa criar usuários nem distribuir permissões. Também vale notar que o MySQL está publicado em localhost:3306; em uma máquina de desenvolvimento isso é comum, mas em servidor real você não deveria expor o banco publicamente.

Resumo: isso existe para garantir que o usuário atlas consiga usar o banco sem erro de permissão, provavelmente por causa de migrations/Prisma. Mas eu deixaria mais restrito.
