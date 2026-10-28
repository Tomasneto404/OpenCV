# Deploy OpenCV

A aplicação usa um único container: a API Node.js serve também a interface compilada na porta 8080. As contas e os CVs guardados usam SQLite num volume `opencv-data`; continua a não ser necessário um segundo container ou chaves para os PDFs.

Copia o [compose.yaml](compose.yaml) para o servidor e executa:

```sh
docker compose up -d --wait
```

Abre http://localhost:8080. O compose descarrega sempre `tomasneto26/opencv:latest` do Docker Hub. `WEB_PORT=80 docker compose up -d --wait` permite usar a porta 80. Para publicar na Internet, podes colocar o serviço atrás de um reverse proxy com HTTPS. Define `TRUST_PROXY=1` apenas quando todo o tráfego passa por um único proxy de confiança.

O container executa como utilizador sem privilégios, com filesystem só de leitura e `/tmp` temporário. Os rascunhos públicos ficam no browser. Contas, sessões e CVs guardados na conta persistem em `/app/data/opencv.sqlite`, no volume `opencv-data`, que é gravável. Não apagues este volume numa atualização.

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

## Login e SSO (OpenID Connect)

O login local funciona sem serviços externos e o editor público permanece gratuito. A primeira conta criada é administradora; numa atualização com contas existentes, a mais antiga recebe esse papel. Define `APP_URL` no `.env` junto ao compose:

```dotenv
APP_URL=https://cv.example.com
```

Entra em **Os meus CVs → Administração → SSO e notificações**. Preenche issuer, client ID, client secret e texto do botão, ativa o SSO e guarda. A configuração é aplicada imediatamente e persistida no volume SQLite. Se o administrador só usa SSO, ativa primeiro o login local no mesmo painel.

Regista no fornecedor OIDC um cliente confidencial com:

- Redirect URI exato: `https://cv.example.com/api/auth/sso/callback`.
- Authorization code flow, PKCE S256, scopes `openid profile email`.
- Autenticação do token endpoint: `client_secret_post`.
- Discovery e JWKS por HTTPS, ID tokens assinados (por exemplo RS256).

O issuer deve ser o URL fornecido pelo IdP, não o endereço do ecrã de login. Em Authentik, usa o issuer da aplicação; em Keycloak, o issuer do realm. Google e Microsoft podem usar o mesmo protocolo com as credenciais e issuer adequados; as políticas e configuração do fornecedor têm de permitir este cliente. Cada combinação issuer + subject corresponde a uma conta: não é feita associação automática por email. O logout termina a sessão OpenCV, não a sessão global do fornecedor.

Sem ativar e configurar SSO no painel, o botão SSO não aparece. Variáveis `OIDC_*` antigas servem apenas para importar a configuração inicial quando ainda não existe uma configuração guardada; depois, gere-a no painel. `APP_URL` deve coincidir com o URL usado pelo browser, incluindo a porta. HTTPS ativa cookies Secure. Só em desenvolvimento é possível usar `OIDC_ALLOW_HTTP=true` com um IdP local por HTTP. Não envies tokens ou secrets para o cliente nem os coloques no Git.

Após alterar variáveis de deployment como `APP_URL`, executa `docker compose up -d --wait`. Alterações no painel não exigem reinício. O servidor cria automaticamente as tabelas na primeira execução. O volume é inicializado com permissões para o utilizador `node` do container.

## Registos, convites, analytics e notificações

O administrador pode desligar novos registos sem bloquear utilizadores existentes, convites válidos ou o editor público. Convites são links de utilização única, associados ao email, válidos durante 7 dias e revogáveis. Partilha-os diretamente; a aplicação não envia emails. Para aceitar por SSO, o fornecedor tem de confirmar o email (`email_verified: true`).

O painel mostra contas, atividade, contagens de CVs, PDFs emitidos e visitas. Os dados de tráfego e exportações começam nesta versão; não são estimados retroativamente. Uma visita é uma sessão de browser com 30 minutos de inatividade. As datas são UTC. Não são guardados IPs, URLs, referrers ou conteúdos de CVs nos analytics. Do Not Track e Global Privacy Control desativam a contagem de visitas nesse browser.

Configura Discord (webhook), Telegram (bot token e chat ID), ntfy (URL base, tópico e token opcional) ou Gotify (URL base e token de aplicação) no painel. Escolhe os eventos de cada serviço, guarda e usa **Enviar notificação de teste**. Só esse botão envia um teste real. Eventos suportados: novas contas e exportações PDF. As mensagens não incluem dados pessoais. O envio é em segundo plano, sem retries automáticos e com timeout de 8 segundos; falhas não interrompem o editor. O painel apresenta o resultado do último envio. Todos os serviços estão desligados por omissão.

## Backup e migração das contas

Preserva `opencv-data` entre atualizações. Para um backup simples e consistente, para temporariamente o serviço e copia todo o diretório `/app/data` (incluindo ficheiros WAL/SHM, se existirem); depois volta a iniciar. Não copies apenas o ficheiro SQLite enquanto o serviço está a escrever. Restaura o diretório com o proprietário UID/GID 1000 antes de iniciar o container.

O editor público não depende de uma sessão e os PDFs continuam portáveis sem chaves. A base de dados contém contas, CVs guardados, métricas e credenciais de integrações: protege os backups tal como o volume de produção. Para uma instalação antiga sem contas, o novo volume é criado automaticamente sem afetar os rascunhos no browser.
