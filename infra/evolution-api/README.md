# Evolution API com Docker Compose

Este Compose sobe a Evolution API, PostgreSQL e Redis para desenvolvimento local. A API fica disponível em `http://localhost:8080`; a porta é publicada somente no host local.

## Pré-requisitos

- Docker instalado e em execução.
- Docker Compose v2 (`docker compose`).

## Configurar e subir

Na raiz do repositório, copie o arquivo de exemplo para criar sua configuração local:

```bash
cp infra/evolution-api/.env.example infra/evolution-api/.env
```

Edite `infra/evolution-api/.env` e substitua `AUTHENTICATION_API_KEY` e `POSTGRES_PASSWORD` por valores próprios. Use letras e números nas senhas para evitar caracteres que precisariam de codificação na URL de conexão com o PostgreSQL. O `.env` não deve ser commitado.

Suba os serviços:

```bash
docker compose -f infra/evolution-api/compose.yaml --env-file infra/evolution-api/.env up -d
```

Veja os logs da API:

```bash
docker compose -f infra/evolution-api/compose.yaml --env-file infra/evolution-api/.env logs -f api
```

Confira a documentação Swagger em `http://localhost:8080/docs`. Chamadas administrativas autenticadas usam o valor `AUTHENTICATION_API_KEY` no cabeçalho `apikey`.

## Comunicação com serviços locais

- Do navegador ou de um programa rodando no host, acesse a API por `http://localhost:8080`.
- Para um webhook/callback enviado pela Evolution API a um programa rodando no host, use `http://host.docker.internal:PORTA/caminho`. O Compose adiciona esse nome também no Linux. `localhost` dentro do container aponta para o próprio container.
- Se o programa estiver em outro container, conecte-o à mesma rede Docker e use o nome do serviço e a porta interna, como `http://meu-app:3000/caminho`.

Para receber callbacks, o servidor no host deve escutar numa interface acessível pelo Docker (normalmente `0.0.0.0`) e a porta deve estar liberada no firewall. O endereço precisa ser configurado no webhook da Evolution API; o Compose não cria esse webhook automaticamente.

## Parar e remover

Pare os containers mantendo os dados:

```bash
docker compose -f infra/evolution-api/compose.yaml --env-file infra/evolution-api/.env down
```

Para apagar também os volumes locais (instâncias, banco de dados e Redis):

```bash
docker compose -f infra/evolution-api/compose.yaml --env-file infra/evolution-api/.env down -v
```

O comando com `-v` apaga os dados armazenados e não pode ser desfeito.

## Segurança

Esta configuração é para desenvolvimento local. Não exponha a API publicamente sem configurar HTTPS, autenticação adequada e controles de acesso. O `.env` contém segredos e fica fora do Git.
