# ⚠ REVERTER ANTES DE PRODUÇÃO — CVeaver

Lista de hacks de teste que **têm de ser removidos** antes do deploy live.
Mantém este ficheiro até voltarem todos para o estado correcto.

## 1. Payment bypass — Sessão 22 (2026-05-22)

**Flag única:** `BYPASS_PAYMENT_FOR_TESTING` em `client/src/App.tsx`.

Quando `true`, o botão "Pagar" no Builder não passa por Stripe — guarda o CV
no servidor, navega para a Paid screen e a Paid descarrega via `/dev/pdf`.

### Como reverter

1. **`client/src/App.tsx`** — pôr a constante a `false` (ou apagar o bloco
   marcado com `FIXME: PAYMENT BYPASS`). A função `pay()` tem uma branch
   `if (BYPASS_PAYMENT_FOR_TESTING) { … return; }` — apagar essa branch.

2. **`client/src/utils/pdf.tsx`** — em `downloadPaidPdf`, apagar a branch
   `if (sessionId === 'TEST') { … }` (vai do FIXME até `}`). O resto da
   função (caminho real `/pdf/:sessionId`) fica como está.

3. **`client/src/components/Builder.tsx`** — remover o banner amarelo
   `TEST MODE — botão de pagar ignora o Stripe…` (bloco marcado com
   `FIXME: TEST MODE banner`).

4. **`server/index.ts`** — opcional: o endpoint `/dev/pdf` só está activo
   quando `NODE_ENV !== 'production'`, por isso em prod fica automaticamente
   desligado. Não tens de mexer aqui se garantires que `NODE_ENV=production`
   no deploy (Coolify/Dokploy fazem-no por defeito).

### Verificação final

Em produção, com Stripe live key configurada:

- Banner amarelo desaparece do Builder
- "Pagar" redirecciona para Stripe Checkout
- `GET /pdf/cs_test_xxx?cv_id=...` sem pagamento → 402
- `POST /dev/pdf` → 404 (rota não registada)

## 2. Stripe go-live — Sessão 10 (todos os métodos)

Implementado em modo **teste** (Sessão 10): Dynamic Payment Methods + webhook
de fulfillment (`/webhook/stripe`) para pagamentos assíncronos
(Multibanco / MB WAY). Falta só virar para live:

### Config `server/.env` (live)

- `STRIPE_SECRET_KEY=sk_live_…`
- `STRIPE_WEBHOOK_SECRET=whsec_…` (do endpoint live, **não** do `stripe listen`)
- `CLIENT_URL=https://cveaver.com`
- `NODE_ENV=production` (desliga `/dev/pdf` e `/dev/test-email`)
- `BETA_MODE=false` (reativa a geração de PDFs). **Em sincronia** com
  `BETA_PAYMENTS = false` em `client/src/App.tsx`. Enquanto beta está on,
  `/create-checkout-session`, `/pdf`, `/fulfill` e o webhook recusam — ninguém
  consegue gerar um CV.
- `STRIPE_PAYMENT_METHODS` — deixar **unset** para Dynamic Payment Methods
  (Stripe mostra o que estiver ativo no Dashboard). Só definir para fixar.
- Rodar a **Resend API key** colada no chat de teste (`re_JR7XgKKV…`) por uma key live.

### Dashboard Stripe (live mode)

- Ativar **Multibanco** (e **MB WAY** se disponível na conta) em
  Settings → Payment methods.
- Criar webhook → `https://cveaver.com/webhook/stripe`, eventos:
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`. Copiar o `whsec_…`.
- Apple Pay: nada a fazer no Checkout hospedado (Stripe trata do domínio).

### Verificação

- Cartão → download imediato + email
- Multibanco → ecrã "Pagamento pendente"; PDF chega por email após confirmação
  (testar em test mode com `stripe trigger checkout.session.async_payment_succeeded`)
- `POST /webhook/stripe` com assinatura inválida → 400
- Sem duplicação de email quando webhook + /pdf disparam para a mesma sessão
