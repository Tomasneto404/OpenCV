# Executar OpenCV com Docker

A stack contém dois serviços: `client` (nginx, porta pública 8080) e `server` (API interna, porta 3001). Não precisa de serviços de pagamento ou email.

```sh
docker compose config -q
docker compose up -d --build
docker compose logs -f
```

Abre http://localhost:8080. `WEB_PORT` altera a porta pública. Para publicar na Internet, coloca a porta do cliente atrás do teu reverse proxy com HTTPS. O browser utiliza `/api` na mesma origem, sem domínios codificados na aplicação.

O compose atual é autónomo: não inicia o antigo Traefik, proxy Docker ou Watchtower. Não contém configuração DNS e não altera um domínio existente. As GitHub Actions constroem imagens `opencv-client` e `opencv-server`; o compose local constrói diretamente o código.

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

## Imagens publicadas no GitHub

Em cada push para `main` (ou execução manual da CI nessa branch), o GitHub Actions valida o código, executa os testes unitários e testa os browsers desktop/mobile contra Docker. Só depois publica ambas as imagens no GitHub Container Registry, para `linux/amd64` e `linux/arm64`:

- `ghcr.io/tomasneto404/opencv-client:latest`
- `ghcr.io/tomasneto404/opencv-server:latest`

Cada imagem recebe também uma tag com o SHA completo do commit. Para uma versão fixa e consistente entre os dois serviços, define `IMAGE_TAG` com esse SHA. O workflow usa `GITHUB_TOKEN` com `packages: write`, sem precisar de um PAT guardado nos secrets. O namespace é obtido automaticamente do proprietário do repositório.

Para executar as imagens publicadas, sem construir no servidor:

```sh
docker compose -f docker-compose.ghcr.yml config -q
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d --wait
```

Se os packages estiverem privados, autentica o host no GHCR com um token que tenha `read:packages`, usando `docker login ghcr.io --username Tomasneto404 --password-stdin`. Alternativamente, torna os dois packages públicos nas definições do GitHub. Não coloques tokens no compose nem no repositório.

Ambos os ficheiros compose usam o mesmo nome de projeto e volume de chaves. Usa apenas um deles de cada vez para a mesma instalação. Numa migração, preserva as chaves antes de substituir os serviços.

Para validar localmente o mesmo fluxo usado na CI:

```sh
docker compose up -d --build --wait
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```
