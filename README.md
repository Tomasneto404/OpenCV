# CVeaver — Pay-per-use CV Generator

> CV + Beaver — the busy little beaver that builds your CV.

Gera um CV bonito num formulário, paga **€1** com Stripe (cartão · Multibanco · MB WAY) e descarrega:

- **PDF** pronto a enviar
- **`cv-config.json`** que podes voltar a carregar mais tarde para atualizar o CV por apenas **€0,50**

Sem registo. Sem subscrição. Sem fricção.

## Como ganha dinheiro

- Form gratuito, com preview sempre visível
- €1,00 para descarregar (PDF + config)
- €0,50 para atualizar (carregas o JSON anterior, mexes o que quiseres, voltas a pagar)
- Custo marginal por PDF: zero (gerado no browser)

## Arranque rápido

```bash
cp .env.example .env       # preencher chaves Stripe
npm run install:all
npm run dev                # client :5173, server :3001
```

Chaves Stripe em https://dashboard.stripe.com/apikeys

## Stack

- **Client**: React 19 + TypeScript + Vite + Tailwind v4 (light/dark via `[data-theme]`)
- **Server**: Express + Stripe Checkout
- **PDF**: @react-pdf/renderer + pdf-lib (client-side, lazy-loaded)
- **i18n**: PT · EN · ES · FR · DE (custom 50-line provider, no deps)
- **Pagamentos**: cartão, Multibanco; MB WAY opcional (requer ativação na conta Stripe)
- **Persistência**: ficheiro JSON local (sem DB, sem PII além do que o cliente escreve)

## Templates incluídos

- Modern — limpo, two-column, sidebar com competências
- Classic — serif, single column, ATS-friendly
- Minimal — só texto, generoso em espaço branco
- Creative — cores e tipografia destacadas
- Executive — premium, double-rule header
- Compact — "Em Breve" / "Coming soon"

## Deploy

Server: Railway/Render/Fly/Coolify · Client: Vercel/Netlify/Caddy.
Definir `CLIENT_URL` no server e `VITE_API_URL` no client para os domínios finais.
