# Executar OpenCV com Docker

A stack contém dois serviços: `client` (nginx, porta pública 8080) e `server` (API interna, porta 3001). Não precisa de serviços de pagamento ou email.

```sh
docker compose config -q
docker compose up -d --wait
docker compose logs -f
```

Abre http://localhost:8080. `WEB_PORT` altera a porta pública. Para publicar na Internet, coloca a porta do cliente atrás do teu reverse proxy com HTTPS. O browser utiliza `/api` na mesma origem, sem domínios codificados na aplicação.

O `compose.yaml` de produção descarrega sempre as imagens `latest` do Docker Hub, sem build local. Basta colocar este ficheiro no servidor e executar o comando acima. `WEB_PORT=80 docker compose up -d --wait` permite usar a porta 80.

O compose atual é autónomo: não inicia o antigo Traefik, proxy Docker ou Watchtower. Não contém configuração DNS e não altera um domínio existente. As GitHub Actions constroem imagens `opencv-client` e `opencv-server`; `docker-compose.yml` permite construir diretamente o código com `-f docker-compose.yml`.

## Migrar uma instalação anterior

1. Faz backup das chaves e dos dados existentes antes de substituir serviços.
2. Mantém `aes.key`, `ed25519.private.pem` e `ed25519.public.pem` no diretório usado pela API. Podes usar um bind mount para o diretório anterior em vez do volume novo `opencv-keys`.
3. Se usavas `PAYLOAD_AES_KEY_B64`, continua a disponibilizar exatamente a mesma chave ao servidor. Sem ela, os PDFs anteriores não podem ser reabertos.
4. Remove as configurações antigas de pagamento, envio de email e notificações de vendas. Não são lidas pela aplicação.
5. Os ficheiros antigos de rascunhos e reclamações não são carregados nem eliminados automaticamente. Trata a retenção desses dados separadamente.
6. Verifica a exportação e reimportação de um PDF antes de encaminhar tráfego para a nova aplicação.

Não uses `docker compose down -v` se quiseres preservar as chaves. O JSON editável exportado pelo utilizador permanece independente das chaves da instalação.

## Verificar

```sh
curl http://localhost:8080/healthz
curl http://localhost:8080/api/health
```

Os builds usam o contexto da raiz do repositório porque cliente e servidor partilham os tipos e a validação em `shared/`.

## Imagens publicadas no Docker Hub

Em cada push para `main` (ou execução manual da CI nessa branch), o GitHub Actions valida o código, executa os testes unitários e testa os browsers desktop/mobile contra Docker. Só depois publica ambas as imagens no Docker Hub, para `linux/amd64` e `linux/arm64`:

- `tomasneto26/opencv-client:latest`
- `tomasneto26/opencv-server:latest`

Cada imagem é construída uma vez por arquitetura e publicada com três tags apontando para o mesmo conteúdo: `latest`, a versão de `package.json` (atualmente **`0.1.0`**) e o SHA completo do commit. Não é feito um segundo build para a tag de versão. Para uma versão fixa e consistente entre os dois serviços, define `IMAGE_TAG` com esse SHA. O workflow publica na conta Docker Hub `tomasneto26`, que é independente do utilizador GitHub `Tomasneto404`.

### Configuração inicial

1. Na conta Docker Hub `tomasneto26`, cria um access token com permissões **Read & Write** em [Account settings → Personal access tokens](https://app.docker.com/settings/personal-access-tokens).
2. No repositório [Tomasneto404/OpenCV → Settings → Secrets and variables → Actions](https://github.com/Tomasneto404/OpenCV/settings/secrets/actions), guarda-o como **`DOCKERHUB_TOKEN`**.
3. Cria os repositórios públicos `tomasneto26/opencv-client` e `tomasneto26/opencv-server` no Docker Hub.
4. Executa novamente a CI em `main` para publicar a primeira versão. O workflow verifica a credencial antes de tentar publicar; os testes não precisam deste secret.

O token fica apenas nos secrets do GitHub. O nome de utilizador está definido no workflow. As tags `latest`, versão e SHA são publicadas nas duas arquiteturas. Atualiza a versão no `package.json` antes de publicar uma nova versão; novos pushes com a mesma versão atualizam essa tag. Usa a tag SHA para fixar um build específico.

Para executar as imagens publicadas, sem construir no servidor:

```sh
docker compose -f compose.yaml config -q
docker compose -f compose.yaml pull
docker compose -f compose.yaml up -d --wait
```

Se optares por imagens privadas, autentica o host com um token de leitura usando `docker login --username tomasneto26 --password-stdin`. Imagens públicas não precisam de autenticação para o pull.

Para fixar a versão atual em vez de seguir `latest`:

```sh
IMAGE_TAG=0.1.0 docker compose up -d --wait
```

Também podes guardar `IMAGE_TAG=0.1.0` num `.env` junto ao `compose.yaml`. Por omissão, o deployment usa `latest`. As chaves são preservadas no volume `opencv-keys` entre atualizações.

Ambos os ficheiros compose usam o mesmo nome de projeto e volume de chaves. Usa apenas um deles de cada vez para a mesma instalação. Numa migração, preserva as chaves antes de substituir os serviços.

Para validar localmente o mesmo fluxo usado na CI:

```sh
docker compose -f docker-compose.yml up -d --build --wait
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```
