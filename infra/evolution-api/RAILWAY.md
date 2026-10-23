# Evolution API no Railway

Este guia cria uma instalação Railway separada da configuração Docker Compose local. O Railway não executa este Compose diretamente: cada serviço vira um serviço Railway, com rede privada e volumes configurados na plataforma. Veja o [guia oficial de Docker Compose no Railway](https://docs.railway.com/guides/docker-compose).

## Criar os serviços

Crie um projeto Railway dedicado para Evolution API e adicione estes serviços ao mesmo ambiente:

1. **PostgreSQL**: adicione o serviço gerenciado PostgreSQL do Railway.
2. **Redis**: adicione o serviço gerenciado Redis do Railway.
3. **Evolution API**: adicione um serviço do tipo Docker Image usando `evoapicloud/evolution-api:v2.3.7`.

O `v2.3.7` é uma versão estável fixada. Revise as [versões oficiais](https://github.com/evolution-foundation/evolution-api/releases) antes de atualizar; não use `latest` em produção.

## Configurar a Evolution API

Na aba **Variables** do serviço Evolution API, adicione as variáveis abaixo. Para as duas URLs de serviços, use **Reference Variables** do Railway, selecionando a URL privada fornecida pelo serviço correspondente. A URL PostgreSQL deve apontar ao Postgres privado e a Redis ao Redis privado, sem expor portas de banco publicamente.

```env
SERVER_PORT=8080
PORT=8080
SERVER_URL=https://SEU-DOMINIO-PUBLICO
AUTHENTICATION_API_KEY=GERE_UMA_CHAVE_LONGA_E_ALEATORIA

DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=${{Postgres.DATABASE_URL}}
DATABASE_CONNECTION_CLIENT_NAME=finances_evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_LABELS=true
DATABASE_SAVE_DATA_HISTORIC=true

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=${{Redis.REDIS_PRIVATE_URL}}
CACHE_REDIS_PREFIX_KEY=finances_evolution
CACHE_LOCAL_ENABLED=false
```

As expressões `${{Postgres.DATABASE_URL}}` e `${{Redis.REDIS_PRIVATE_URL}}` são referências Railway: configure-as pelo seletor de referências e confirme os nomes reais dos serviços e variáveis exibidos no seu projeto. Não copie credenciais de banco para este arquivo nem para o Git.

## Rede pública e persistência

No serviço Evolution API:

1. Gere um domínio público em **Settings → Networking**.
2. Confirme que o domínio encaminha para a porta `8080` e use esse domínio HTTPS no `SERVER_URL`.
3. Adicione um Railway Volume montado em `/evolution/instances`.
4. Mantenha uma única réplica para esta instância e sessão do WhatsApp.

PostgreSQL e Redis devem continuar privados. Só a API precisa do domínio público. O Railway fornece rede privada entre serviços pelo hostname interno `*.railway.internal`; `localhost` e `host.docker.internal` do Compose local não se aplicam no Railway. [Rede privada Railway](https://docs.railway.com/networking/private-networking) · [Volumes Railway](https://docs.railway.com/volumes)

## Validar após o deploy

Abra `https://SEU-DOMINIO-PUBLICO/docs` e verifique os logs do serviço. Antes de conectar uma conta real, confirme que o serviço iniciou com Postgres e Redis, que o volume está montado e que `SERVER_URL` contém o domínio HTTPS correto. Configure webhooks para endpoints HTTPS publicamente acessíveis; URLs `localhost` não são alcançáveis pelo Railway.

Esta configuração não faz o deploy automaticamente. Trate chaves, sessões e mensagens do WhatsApp como dados sensíveis: não as coloque no Git ou em logs, e valide retenção, backups, região e controles de acesso antes de usar dados de usuários em produção.
