# CVeaver — Pay-per-use CV Generator

> CV + Beaver — the busy little beaver that builds your CV.
> Live at **[cveaver.com](https://cveaver.com)**.

Gera um CV bonito num formulário, paga **€1** com Stripe (cartão · Multibanco · MB WAY), descarrega o **PDF** e recebe-o também por email. Para atualizar mais tarde, basta carregar o PDF anterior — pagas apenas **€0,50**.

Sem registo. Sem subscrição. Sem PII guardada além do estritamente necessário para gerar o ficheiro.

## Como ganha dinheiro

- Form gratuito, com preview sempre visível
- €1,00 para descarregar PDF (também enviado por email)
- €0,50 para atualizar (carregas o PDF anterior, server reconhece via assinatura interna)
- Custo marginal por PDF: ~300 ms de CPU server-side + 1 email via Resend

## Funcionalidades

- **6 templates premium** com paleta accent escolhida pelo utilizador (Modern · Classic · Minimal · Creative · Executive · Compact "Em Breve")
- **i18n** em 5 idiomas: PT · EN · ES · FR · DE (custom 50-line provider, zero dependências)
- **Light + dark mode** com toggle persistido em `localStorage`, fallback `prefers-color-scheme`
- **Certificados PDF anexáveis** — sem limite de número, 10 MB por ficheiro, 50 MB total
  - Thumbnails em tempo real via pdfjs (lazy)
  - Drag-and-drop para reordenar via `@dnd-kit/sortable`
  - Moldura template-coerente: o server embebe cada certificado dentro de uma página com header + cor accent compatível com o template escolhido (sidebar para Modern, double-rule para Executive, header block para Creative, etc.)
- **Sistema de badges/rank** baseado em `editCount` por CV — 5 tiers de "Castor Cria" a "Engenheiro Castor". Tamper-evident, server-only increment
- **Email do PDF gerado** — após pagamento, o PDF é enviado para o email indicado no Stripe Checkout. O email fica guardado dentro do PDF para pre-fill em updates
- **Estrutura premium estilo Apple**: nav frosted sticky, layered shadow stack, hover lift suave em cards, animations com `cubic-bezier(.4, 0, .2, 1)`, hero generoso, footer estruturado em colunas (Produto / Suporte / Legal)
- **`/support`** — drop um PDF, verifica autenticidade (boolean), abre reclamação se válido (server-stored em `data/complaints.json`)
- **`/faq`** e **`/terms`** com conteúdo i18n
- **Konami code** easter egg (↑↑↓↓←→←→BA)

## Arquitetura de segurança

- **PDF renderer apenas no server** (`@react-pdf/renderer` + pdf-lib em Node). O bundle do cliente não tem o renderer — não é possível descarregar PDFs sem pagamento via DevTools.
- **Paywall**: `GET /pdf/:sessionId` confirma `payment_status === 'paid'` com a Stripe antes de gerar/devolver o ficheiro.
- **Payload embebido encriptado** com AES-256-GCM (chave server-only em `server/keys/aes.key`, gitignored). O attachment opaco `cveaver.dat` permite reconhecer o PDF para o update flow sem expor a config ao utilizador.
- **Assinatura interna Ed25519** (`server/keys/ed25519.*.pem`) usada pelo `/support` para verificar autoria — nunca exposta na UI.
- **Helmet** + `express-rate-limit` por rota (`/pdf` 4/min, `/decode-pdf` 10/min, `/create-checkout-session` 5/min, `/support` 3/min).
- **`p-limit`** restringe renders PDF concorrentes (default 4).
- **Watermark + capture guards** no preview (Ctrl/Cmd+P/S blocker, no-context-menu, no-select, `@media print` hidden). Fricção contra screenshot casual — o paywall real é server-side.

> ⚠️ **Backup obrigatório de `server/keys/`** (AES + Ed25519). Se a chave AES se perder, todos os PDFs anteriores ficam ilegíveis ao update flow.

## Arranque rápido (dev)

```bash
cp .env.example .env       # preencher Stripe + Resend
npm run install:all
npm run dev                # client :5173, server :3001
```

### Variáveis de ambiente

Único `.env` na raiz cobre client + server + Traefik. Detalhes em [.env.example](.env.example).

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DOMAIN` | em prod | dominío base (`cveaver.com`). Traefik serve `${DOMAIN}` + `api.${DOMAIN}` + `traefik.${DOMAIN}` |
| `ACME_EMAIL` | em prod | email Let's Encrypt para avisos de renovação |
| `TRAEFIK_DASHBOARD_AUTH` | opcional | htpasswd `admin:$$apr1$$…` para o dashboard |
| `STRIPE_SECRET_KEY` | sim | `sk_live_...` (ou `sk_test_...` em staging) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | sim | `pk_live_...` para o client |
| `STRIPE_PAYMENT_METHODS` | não | `card,multibanco,mb_way` (default: `card,multibanco`) |
| `RESEND_API_KEY` | recomendado | sem key, o email é silenciosamente omitido |
| `RESEND_FROM` | recomendado | `CVeaver <noreply@cveaver.com>`. **O domínio tem de estar verificado no Resend** (DKIM/DMARC) |
| `PDF_CONCURRENCY` | não | default 4 |
| `PAYLOAD_AES_KEY_B64` | não | override AES key (base64). Por defeito é gerado e persistido no volume |

## Stack

- **Client**: React 19 + TypeScript + Vite + Tailwind v4 + `@dnd-kit/sortable` + `pdfjs-dist` (lazy)
- **Server**: Express 4 + TypeScript via `tsx` (runtime ESM loader) + `@react-pdf/renderer` + `pdf-lib` + Helmet + `express-rate-limit` + `p-limit`
- **Email**: [Resend](https://resend.com) (com domínio verificado DKIM/DMARC)
- **Pagamentos**: Stripe Checkout (cartão, Multibanco; MB WAY opcional)
- **Reverse proxy / TLS**: Traefik v3 com Let's Encrypt (TLS-ALPN-01)
- **Persistência**: ficheiro JSON local em volume Docker (sem DB; TTL 24h nos drafts)
- **PDF storage**: o ficheiro carrega encriptado dentro de si mesmo o CV + meta + assinatura para suportar o update flow sem servidor a guardar PII

## Endpoints

| Método | Path | Auth | Notas |
|--------|------|------|-------|
| `GET`  | `/health` | — | liveness probe |
| `POST` | `/cv` | rate-limited | guarda um draft, devolve id efémero |
| `GET`  | `/cv/:id` | — | lê o draft (após Stripe roundtrip) |
| `POST` | `/create-checkout-session` | rate-limited | cria checkout (aceita `customerEmail` para pre-fill) |
| `GET`  | `/verify-session/:sessionId` | — | apenas devolve `{ paid: bool }` |
| `GET`  | `/pdf/:sessionId?cv_id=X` | **Stripe paid** | **paywall**: gera + assina + encripta + envia email + devolve o PDF |
| `POST` | `/decode-pdf` | rate-limited | recebe PDF raw, devolve `{ cv, meta, verified, prevPayloadB64 }` |
| `POST` | `/support` | rate-limited | submete uma reclamação ligada a um PDF verificado |
| `POST` | `/verify-pdf` | — | bool-only verifier para o `/support` UI |
| `GET`  | `/public-key` | — | Ed25519 public key (para verificadores offline) |
| `POST` | `/dev/pdf` | DEV only | gera + assina sem Stripe — desligado em produção |

## Deploy (Traefik self-host)

A stack inteira corre via um único `docker compose up -d` numa VPS ou homelab.

### 1. Pré-requisitos

- VPS / homelab com Docker + Docker Compose
- Domínio com DNS apontado:
  - `cveaver.com  → IP do servidor`
  - `api.cveaver.com → IP do servidor`
  - `www.cveaver.com → IP do servidor`
  - `traefik.cveaver.com → IP do servidor` (opcional, dashboard)
- Portos 80/443 abertos no firewall
- Conta [Stripe](https://stripe.com) com chaves live + Multibanco/MB WAY activos
- Conta [Resend](https://resend.com) com domínio verificado (DKIM/DMARC OK)

### 2. Setup inicial

```bash
git clone https://github.com/Tomasneto404/CVeaver.git
cd CVeaver
cp .env.example .env
$EDITOR .env                    # preencher tudo o que está marcado :?required

# Dashboard Traefik (opcional, basic-auth)
htpasswd -nb admin minha_password_forte | sed 's/\$/\$\$/g'
# → copia o resultado para TRAEFIK_DASHBOARD_AUTH

docker compose up -d --build
```

Traefik resolve TLS automaticamente — primeiro arranque demora ~30 s a aprovisionar os certificados Let's Encrypt para `cveaver.com`, `api.cveaver.com`, `www.cveaver.com` (e `traefik.cveaver.com` se configurares basic-auth).

### 3. Verificar

```bash
# Health probes
curl https://api.cveaver.com/health
curl -I https://cveaver.com

# Traefik logs
docker compose logs -f traefik

# Server logs (PDF deliveries, email status)
docker compose logs -f server
```

### 4. Backup crítico

Dois volumes precisam de backup periódico:

- **`cveaver-keys`** — Ed25519 + AES keys. Perder = todos os PDFs anteriores ficam ilegíveis para o update flow. **Backup obrigatório.**
- **`traefik-acme`** — Let's Encrypt cert store. Perder = nova provisão na próxima reinicialização (rate-limited por LE, evitar fazer flush sem necessidade).

Exemplo (cron diário):

```bash
docker run --rm -v cveaver-keys:/src -v /backup:/dst alpine \
  tar czf /dst/cveaver-keys-$(date +%F).tar.gz -C /src .
```

### 5. Em Coolify / Dokploy

A compose file funciona tal-como-está em Coolify — basta apontar o repositório e definir as env vars na UI. Coolify gere o seu próprio Traefik por baixo; deixar o `traefik` service do compose **desactivado** (ou usar o ficheiro só para builds, configurando o routing via Coolify labels) é a opção mais limpa para evitar duplo proxy.

Para um simples push-to-deploy via GitHub Actions ou Coolify auto-webhook: ambos vão fazer `docker compose up -d --build`.

### Honest call-outs

- O `BYPASS_PAYMENT_FOR_TESTING` no client tem de ser revertido antes do deploy live — passo-a-passo em [.claude/REVERT_BEFORE_PROD.md](.claude/REVERT_BEFORE_PROD.md).
- Resend free tier (100 emails/dia) é mais que suficiente para arranque. Para volumes maiores subir para o tier pago.
- Stripe live keys precisam de Multibanco/MB WAY activado nas [definições de payment methods](https://dashboard.stripe.com/settings/payment_methods).

## Estrutura

```
client/src/
  components/        # Landing · Builder · Paid · Support · FAQ · Terms · Toast · BrandMark · ThemeToggle · LanguageSwitcher · Badge · FaqItem · KonamiEgg
  components/Form/   # secções editáveis do CV (Personal · Experience · ... · Certificates)
  templates/         # 6 previews HTML/Tailwind
  i18n/              # pt/en/es/fr/de + provider (Shape<T> widening)
  utils/             # photo · certificate · pdfThumbnail · pdf · loadConfig · badges · captureGuard · sampleAssets · format · download · log
  state/useCV.ts     # undo/redo + localStorage persistence
  App.tsx
server/
  index.ts           # Express + endpoints
  sign.js            # Ed25519 keypair + canonical sign/verify
  crypto.js          # AES-256-GCM payload encrypt/decrypt
  mail.ts            # Resend wrapper
  security.ts        # input validators, safe-err, redact, randomId
  pdf/render.ts      # template-aware framed cert renderer
  pdf/read.ts        # decrypt payload from uploaded PDF
  pdf/templates/     # 5 @react-pdf renderers
  keys/              # generated Ed25519 + AES keys (gitignored)
  data/              # CV drafts + complaints (gitignored)
```

## Templates

| Template | Look |
|----------|------|
| **Modern**    | Sidebar accent vertical com competências + idiomas |
| **Classic**   | Serif centrado, single column, ATS-friendly |
| **Minimal**   | Tipografia generosa, hairline rule, ATS-friendly |
| **Creative**  | Header colorido + duas colunas |
| **Executive** | Premium serif com double-rule header |
| **Compact**   | Placeholder "Em Breve" |

Cada certificado anexado é embebido numa página com **moldura coerente com o template escolhido** (mesmo accent color, mesma estrutura visual). O utilizador pode desactivar a moldura por certificado para fallback de cópia 1:1.

## Sample CV

A demo (botão "Ver exemplo" na Landing) carrega o currículo do **Zé Castor** — engenheiro civil de Paços de Ferreira, ex-escuteiro, ex-militar, mascote do FC Paços de Ferreira. Inclui um certificado fictício gerado em runtime para mostrar a funcionalidade de certificados sem ter ficheiros reais no repo.

## Roadmap

Restante: Stripe live deploy (`Sessão 10` na backlog).

## Licença

Privado — todos os direitos reservados a Tomás Neto. © 2026.
