# CVeaver — Pay-per-use CV Generator

> CV + Beaver — the busy little beaver that builds your CV.
> Live at **[cveaver.com](https://cveaver.com)**.

Gera um CV bonito num formulário, paga **€1** com Stripe (cartão · Multibanco · MB WAY), descarrega o **PDF** e recebe-o também por email. Para atualizar mais tarde, basta carregar o PDF anterior — pagas apenas **€0,50**.

Sem registo. Sem subscrição. Sem PII guardada além do estritamente necessário para gerar o ficheiro.

## Como ganha dinheiro

- Form gratuito, com preview sempre visível
- €1,00 para descarregar PDF (também enviado por email)
- €0,50 para atualizar (carregas o PDF anterior, server reconhece via assinatura interna)
- Custo marginal por PDF: ~300 ms de CPU server-side + envio SMTP

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

## Arranque rápido

```bash
cp .env.example .env       # preencher chaves Stripe + SMTP
npm run install:all
npm run dev                # client :5173, server :3001
```

### Variáveis de ambiente

**Server (`.env`):**

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `STRIPE_SECRET_KEY` | sim | `sk_live_...` ou `sk_test_...` |
| `STRIPE_PAYMENT_METHODS` | não | `card,multibanco,mb_way` (default: `card,multibanco`) |
| `CLIENT_URL` | sim | URL do client em produção |
| `PORT` | não | default 3001 |
| `NODE_ENV` | sim em prod | `production` desactiva `/dev/pdf` |
| `PDF_CONCURRENCY` | não | default 4 |
| `SMTP_HOST` | recomendado | sem SMTP, o email é silenciosamente omitido |
| `SMTP_PORT` | não | default 587 |
| `SMTP_USER` / `SMTP_PASS` | recomendado | credenciais |
| `SMTP_FROM` | não | default = `SMTP_USER` |
| `SMTP_SECURE` | não | `true` para força TLS |
| `SIGN_KEY_DIR` | não | override path para `server/keys/` |
| `PAYLOAD_AES_KEY_B64` | não | override AES key (base64) — útil para multi-replica |

**Client (`.env`):**

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL do server (default `http://localhost:3001`) |

## Stack

- **Client**: React 19 + TypeScript + Vite + Tailwind v4 + `@dnd-kit/sortable` + `pdfjs-dist` (lazy)
- **Server**: Express 4 + TypeScript via `tsx` (runtime ESM loader) + `@react-pdf/renderer` + `pdf-lib` + `nodemailer` + Helmet + `express-rate-limit` + `p-limit`
- **Pagamentos**: Stripe Checkout (cartão, Multibanco; MB WAY opcional)
- **Persistência**: ficheiro JSON local em `server/data/` (sem DB; gitignored)
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

## Deploy

Self-hosted: **Coolify / Dokploy** (Docker compose já incluído).

Steps:
1. Definir todos os env vars listados acima — em particular as chaves Stripe live e o SMTP
2. Garantir que o volume de `server/keys/` tem **backup** (geração das chaves só acontece no primeiro arranque; perder = update flow quebrado)
3. `CLIENT_URL=https://cveaver.com` no server, `VITE_API_URL=https://api.cveaver.com` no build do client
4. `NODE_ENV=production` garante que `/dev/pdf` fica desactivado

Alternativas: Railway / Render / Fly.io (server) · Vercel / Netlify / Caddy (client).

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
  mail.ts            # nodemailer wrapper
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
