# Deploy — CVeaver

Production stack: **Traefik** (TLS + routing) + **server** (`api.${DOMAIN}`) +
**client** (`${DOMAIN}`), all in `docker-compose.yml`. Self-contained — no
external reverse proxy needed.

## 1. VPS

- Recommended: **Hetzner CX22** (2 vCPU, 4 GB RAM), EU region for PT latency.
  The PDF renderer is `@react-pdf/renderer` (no headless browser), so it's
  light; 4 GB is comfortable with `PDF_CONCURRENCY=4`.
- OS: Ubuntu 24.04. Install Docker Engine + the compose plugin.
- Open ports **80** and **443** (Let's Encrypt TLS-ALPN-01 needs 443).

## 2. DNS

Point these A-records at the VPS IP:

| Host | Serves |
|------|--------|
| `cveaver.com` | client |
| `www.cveaver.com` | 301 → root |
| `api.cveaver.com` | server (API + Stripe webhook) |
| `traefik.cveaver.com` | dashboard (optional, basic-auth) |

## 3. Configure

```sh
git clone <repo> && cd easyCV
cp .env.example .env
# Fill: DOMAIN, ACME_EMAIL, STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY,
#       STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM, TRAEFIK_DASHBOARD_AUTH
```

Leave `STRIPE_PAYMENT_METHODS` **empty** to use Dynamic Payment Methods (Stripe
shows everything enabled in the Dashboard: card + Apple/Google Pay +
Multibanco/MB WAY).

## 4. Launch

```sh
docker compose up -d --build
```

Traefik issues Let's Encrypt certs automatically on first request. Verify:

```sh
curl -s https://api.cveaver.com/health     # → {"ok":true} (or 200)
# open https://cveaver.com in a browser
```

## 5. Stripe (live)

Account activation reviews the **public website** (what you sell, price, terms,
support) — already covered by the landing page, FAQ, /terms and /support. You
do **not** need live keys for the website review; the URL just has to be live.

After the account is activated:

1. Switch to live keys: `STRIPE_SECRET_KEY=sk_live_…`
   (and `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_…` if/when used client-side).
2. Enable payment methods in **live mode** (Settings → Payment methods):
   card, Multibanco, MB WAY (if available), Apple/Google Pay.
3. Create the webhook → **`https://api.cveaver.com/webhook/stripe`**, events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`. Paste its `whsec_…` into
   `STRIPE_WEBHOOK_SECRET`.
4. Flip the **Beta flag**: `BETA_PAYMENTS = false` in `client/src/App.tsx`
   (removes the Beta badge/banner). See also `.claude/REVERT_BEFORE_PROD.md`
   for the remaining test-code cleanup.
5. `docker compose up -d --build` to apply.

## 6. Backups — critical

The **`cveaver-keys`** volume holds the AES + Ed25519 keys. Losing it makes
every previously generated PDF impossible to decode in the update flow.

```sh
# Example: nightly backup of the keys volume
docker run --rm -v cveaver-keys:/keys -v "$PWD/backups":/out alpine \
  tar czf /out/cveaver-keys-$(date +%F).tgz -C /keys .
```

`cveaver-data` holds draft CVs (24 h TTL) + complaints — less critical but
worth including.

## 7. Verification checklist (production)

- [ ] `https://cveaver.com` and `https://api.cveaver.com/health` over valid TLS
- [ ] Card payment → PDF emailed on return + downloadable
- [ ] Webhook deliveries show `200` in the Stripe Dashboard
- [ ] Multibanco → "pending" screen; PDF arrives by email after confirmation
- [ ] `POST /dev/pdf` → 404 (disabled by `NODE_ENV=production`)
- [ ] No duplicate emails (webhook + /fulfill share the `delivered` guard)
