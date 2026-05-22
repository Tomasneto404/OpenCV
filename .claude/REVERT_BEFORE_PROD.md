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
