# Deploy OpenCV

A aplicação usa um único container: a API Node.js serve também a interface compilada na porta 8080. Não precisa de chaves, volumes, base de dados, nginx ou serviços externos.

Copia o [compose.yaml](compose.yaml) para o servidor e executa:

```sh
docker compose up -d --wait
```

Abre http://localhost:8080. O compose descarrega sempre `tomasneto26/opencv:latest` do Docker Hub. `WEB_PORT=80 docker compose up -d --wait` permite usar a porta 80. Para publicar na Internet, podes colocar o serviço atrás de um reverse proxy com HTTPS. Define `TRUST_PROXY=1` apenas quando todo o tráfego passa por um único proxy de confiança.

O container executa como utilizador sem privilégios, com filesystem só de leitura e `/tmp` temporário. Os dados dos CVs são processados em memória; os rascunhos ficam no browser. Não há dados da aplicação a persistir no servidor.

## Tags e atualizações

A CI publica a mesma imagem em `linux/amd64` e `linux/arm64`, com estas tags:

- `tomasneto26/opencv:latest`
- `tomasneto26/opencv:0.1.0` — versão atual do `package.json`
- `tomasneto26/opencv:<SHA>` — commit que originou o build

Para fixar a versão atual:

```sh
IMAGE_TAG=0.1.0 docker compose up -d --wait
```

Podes guardar `IMAGE_TAG=0.1.0`, `WEB_PORT=8080` e `PDF_CONCURRENCY=2` num `.env` junto ao compose. Novos pushes com a mesma versão atualizam essa tag; usa a tag SHA para fixar um build específico. Para atualizar `latest`, volta a executar `docker compose up -d --wait`.

## Publicação no Docker Hub

Depois de passarem o build, TypeScript, testes unitários, testes de browser contra o container e verificação de segredos, o GitHub Actions publica `tomasneto26/opencv`.

O workflow usa o secret `DOCKERHUB_TOKEN` do repositório [Tomasneto404/OpenCV](https://github.com/Tomasneto404/OpenCV/settings/secrets/actions), com permissões Read & Write na conta Docker Hub `tomasneto26`. Mantém o repositório Docker Hub `opencv` público para permitir o pull sem autenticação. As tags `latest`, versão e SHA são atribuídas ao mesmo build.

## Migrar a stack anterior

A stack antiga tinha serviços `client` e `server` e um volume de chaves. Antes de a substituir, guarda em JSON os CVs que só tens em PDFs antigos encriptados, usando a versão anterior da aplicação. Os PDFs novos contêm um anexo `opencv.json` sem encriptação e podem ser reabertos em qualquer instalação OpenCV, mesmo depois de recriar o container.

Para substituir os serviços antigos pelo novo:

```sh
docker compose up -d --wait --remove-orphans
```

O nome de projeto continua a ser `opencv`. Este comando remove os containers antigos desse projeto; o volume de chaves anterior não é eliminado nem usado pela nova aplicação. As imagens antigas `opencv-client` e `opencv-server` deixam de ser publicadas.

## Validar localmente

```sh
docker compose -f docker-compose.yml up -d --build --wait
curl http://localhost:8080/api/health
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```

O `Dockerfile` na raiz compila o cliente numa etapa separada e inclui o resultado na imagem Node.js final. Para usar imagens publicadas, utiliza `compose.yaml`; para construir o código local, utiliza `docker-compose.yml` explicitamente.
