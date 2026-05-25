/**
 * CVeaver server.
 *
 * Surface:
 *   POST /cv                       — stash a CV draft, returns id
 *   GET  /cv/:id                   — read it back (after Stripe roundtrip)
 *   POST /create-checkout-session  — Stripe Checkout creation
 *   GET  /verify-session/:sessionId — Stripe status only
 *   GET  /fulfill/:sessionId       — email the PDF on payment (idempotent)
 *   GET  /pdf/:sessionId?cv_id=X   — **PAYWALLED**. Renders, encrypts,
 *                                    signs internally, emails, returns PDF.
 *                                    202 when payment is still pending (async).
 *   POST /webhook/stripe           — Stripe events; fulfils async payments
 *                                    (Multibanco/MB WAY) by emailing the PDF
 *   POST /decode-pdf               — decrypt payload for the update flow
 *   POST /support                  — file a complaint
 *   POST /verify-pdf               — bool-only verifier used by /support
 *   GET  /public-key               — Ed25519 public key (offline verify)
 *   GET  /health                   — liveness probe
 *
 * Hardening (Sessão 25 · OWASP Top 10):
 *   - crypto-strong IDs (A02), input validation (A03/A04),
 *     Helmet CSP (A05), generic error messages in prod (A05/A09),
 *     filename sanitisation (A03), redacted logs (A09),
 *     store entries auto-expire after 24h (A04).
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pLimit from 'p-limit';
import Stripe from 'stripe';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — sign.js is plain ESM JS, no .d.ts needed at runtime.
import { signCV, verifyCV, getPublicKey } from './sign.js';
import { renderPdf } from './pdf/render.ts';
import { readPayloadFromPdf } from './pdf/read.ts';
import { sendCvByEmail } from './mail.ts';
import { notifyOwnerOfSale } from './notify.ts';
import type { CVData, CVMeta, EmbedPayloadV2 } from './types.ts';
import {
  randomId,
  validateCV,
  safeFilename,
  safeErrorMessage,
  redactEmail,
  withinCertSizeCap,
} from './security.ts';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = process.env.DATA_DIR || join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'cvs.json');

const PRICE_NEW_CENTS    = 100;
const PRICE_UPDATE_CENTS = 50;

const ALLOWED_METHODS = new Set(['card', 'multibanco', 'mb_way']);
/* When STRIPE_PAYMENT_METHODS is set we pin Checkout to that list. When it's
   unset we omit `payment_method_types` entirely so Stripe shows every method
   enabled in the Dashboard (Dynamic Payment Methods) — card + wallets
   (Apple/Google Pay ride on `card`) + Multibanco/MB WAY, adapted to the buyer.
   Apple/Google Pay need no explicit type; they appear automatically on the
   hosted Checkout over HTTPS. Async methods (Multibanco/MB WAY) are fulfilled
   by the /webhook/stripe handler, not the synchronous return. */
const PAYMENT_METHODS_ENV = process.env.STRIPE_PAYMENT_METHODS;
const PAYMENT_METHODS = PAYMENT_METHODS_ENV
  ? PAYMENT_METHODS_ENV.split(',').map((m) => m.trim()).filter((m) => ALLOWED_METHODS.has(m))
  : null;

const IS_PROD = process.env.NODE_ENV === 'production';

/* Beta mode — payments aren't live, so PDF generation is fully disabled: no
   checkout, no paywall render, no email delivery. Prevents anyone from
   obtaining the paid product for free while the flow is still in testing.
   Fail-safe: ON unless explicitly disabled with BETA_MODE=false. Mirror the
   client's BETA_PAYMENTS flag; flip both (and swap to live keys) to go live. */
const BETA_MODE = process.env.BETA_MODE !== 'false';

/* Entries older than this are evicted at write time to avoid unbounded
   disk growth from abandoned drafts. */
const STORE_TTL_MS = 24 * 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[0-9a-f]{32}$/;
const STRIPE_SESSION_RE = /^cs_(test_|live_)[A-Za-z0-9]+$/;

/* ── Persistent store ──────────────────────────────────── */

interface StoreEntry {
  cv: CVData;
  savedAt: number;
  prevPayloadB64?: string;
  customerEmail?: string;
  /** Set once the paid PDF has been emailed for this CV. Guards against
     double-delivery when both the webhook and the synchronous /pdf path
     fire for the same (card) session. */
  delivered?: boolean;
  /** Set once an owner sale-ping has been sent for this CV. Guards against
     duplicate notifications when Stripe re-delivers the webhook event. */
  notified?: boolean;
}

type Store = Record<string, StoreEntry>;

function loadStore(): Store {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(DATA_FILE)) return {};
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function pruneStore(s: Store): Store {
  const cutoff = Date.now() - STORE_TTL_MS;
  let dropped = 0;
  for (const id of Object.keys(s)) {
    if (s[id].savedAt < cutoff) {
      delete s[id];
      dropped++;
    }
  }
  if (dropped > 0) console.log(`[store] pruned ${dropped} entries older than ${STORE_TTL_MS / 3600000}h`);
  return s;
}

function saveStore(data: Store): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(data));
  } catch (err) {
    console.error('Store write failed:', (err as Error).message);
  }
}

let store = pruneStore(loadStore());

/* ── Express ───────────────────────────────────────────── */

const app    = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

/* Trust proxy is needed for req.ip to reflect the real client when behind
   a reverse proxy (Coolify/nginx/Cloudflare). Trust only the first hop. */
app.set('trust proxy', 1);

/* Helmet — full bundle with a tightened CSP. The API only serves JSON +
   PDF; nothing needs scripts / styles inline. */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy:   { policy: 'same-origin' },
  referrerPolicy:            { policy: 'no-referrer' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc:    ["'none'"],
      baseUri:       ["'none'"],
      frameAncestors: ["'none'"],
      formAction:    ["'self'"],
    },
  },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

app.use(cors({ origin: clientUrl }));

/* ── Stripe webhook ────────────────────────────────────────
   MUST be registered before express.json(): signature verification needs
   the raw request body, untouched by the JSON parser. This is the source of
   truth for fulfilment — it covers both synchronous methods (card/wallets,
   `checkout.session.completed`) and asynchronous ones (Multibanco/MB WAY,
   `checkout.session.async_payment_succeeded`, confirmed hours later). */
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || typeof sig !== 'string') {
    return res.status(400).send('Webhook not configured');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[webhook] bad signature:', (err as Error).message);
    return res.status(400).send('Invalid signature');
  }

  try {
    if (event.type === 'checkout.session.completed'
      || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        // Ping the owner about the sale (fire-and-forget — must not block the
        // webhook ACK nor fail PDF delivery). Idempotent on the store entry.
        notifyOwnerOnce(session);
        await deliverForSession(session);
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[webhook] async payment failed for session ${session.id}`);
    }
  } catch (err) {
    // Return 500 so Stripe retries transient failures (e.g. a render hiccup).
    console.error('[webhook] handler error:', (err as Error).message);
    return res.status(500).send('handler error');
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '60mb' })); // photo + up to ~50 MB of certs

/* PDF renders are heavy. Cap concurrency. */
const renderLimit = pLimit(Number(process.env.PDF_CONCURRENCY ?? 4));

/* ── Rate limiters ─────────────────────────────────────── */

const standardLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const writeLimiter    = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
const checkoutLimiter = rateLimit({ windowMs: 60_000, max: 5,  standardHeaders: true, legacyHeaders: false });
const pdfLimiter      = rateLimit({ windowMs: 60_000, max: 4,  standardHeaders: true, legacyHeaders: false });
const supportLimiter  = rateLimit({ windowMs: 60_000, max: 3,  standardHeaders: true, legacyHeaders: false });
const decodeLimiter   = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

app.get('/health', (_req, res) => res.json({ ok: true, service: 'cveaver' }));

/* ── CV draft store ────────────────────────────────────── */

app.post('/cv', writeLimiter, (req: Request, res: Response) => {
  try {
    const { cv: rawCv, prevPayloadB64, customerEmail } = req.body as {
      cv?: unknown;
      prevPayloadB64?: unknown;
      customerEmail?: unknown;
    };

    const cv = validateCV(rawCv);
    if (!cv) return res.status(400).json({ error: 'Invalid CV shape' });
    if (!withinCertSizeCap(cv.certificates)) {
      return res.status(413).json({ error: 'Certificates exceed combined cap' });
    }

    const id = randomId();
    const entry: StoreEntry = { cv, savedAt: Date.now() };
    if (typeof prevPayloadB64 === 'string' && prevPayloadB64.length < 64 * 1024 * 1024) {
      entry.prevPayloadB64 = prevPayloadB64;
    }
    if (typeof customerEmail === 'string' && EMAIL_RE.test(customerEmail) && customerEmail.length < 256) {
      entry.customerEmail = customerEmail;
    }
    store[id] = entry;
    store = pruneStore(store);
    saveStore(store);
    res.json({ id });
  } catch (err) {
    console.error('[cv:post]', (err as Error).message);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

app.get('/cv/:id', standardLimiter, (req: Request, res: Response) => {
  if (!ID_RE.test(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const entry = store[req.params.id];
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry.cv);
});

/* ── Stripe Checkout ───────────────────────────────────── */

function buildCheckout({ cvId, mode, customerEmail }: { cvId: string; mode?: 'new' | 'update'; customerEmail?: string }) {
  const isUpdate = mode === 'update';
  const amount   = isUpdate ? PRICE_UPDATE_CENTS : PRICE_NEW_CENTS;
  const label    = isUpdate ? 'CVeaver — Update CV (PDF download)' : 'CVeaver — New CV (PDF download)';
  const desc     = isUpdate
    ? 'Atualizar CV existente — descarrega o novo PDF e recebe por email.'
    : 'Gera um CV profissional — descarrega o PDF e recebe por email.';

  const params: Stripe.Checkout.SessionCreateParams = {
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: label, description: desc },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    // The webhook reads cvId/mode from metadata to fulfil the order — the
    // success_url query string is not available server-side on async methods.
    metadata: { cvId, mode: isUpdate ? 'update' : 'new' },
    success_url: `${clientUrl}?success=true&session_id={CHECKOUT_SESSION_ID}&cv_id=${cvId}&kind=${isUpdate ? 'update' : 'new'}`,
    cancel_url:  `${clientUrl}?canceled=true`,
  };
  // Pin methods only when explicitly configured; otherwise omit so Stripe
  // uses Dynamic Payment Methods from the Dashboard (see PAYMENT_METHODS).
  if (PAYMENT_METHODS && PAYMENT_METHODS.length > 0) {
    params.payment_method_types = PAYMENT_METHODS as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  }
  if (customerEmail) params.customer_email = customerEmail;
  return params;
}

/* ── Fulfilment helpers (shared by /pdf and the webhook) ──── */

/** Render the paid PDF for a stored CV. Pure: no email, no store mutation.
    Returns null when the CV is no longer in the store (expired draft). */
async function buildPaidPdf(
  cvId: string,
  customerEmail: string | null,
): Promise<{ pdf: Buffer; meta: CVMeta; filename: string } | null> {
  const stored = store[cvId];
  if (!stored) return null;
  const cv = stored.cv;
  const now = new Date().toISOString();

  let prevMeta: CVMeta | null = null;
  if (stored.prevPayloadB64) {
    try {
      const { decryptPayload } = await import('./crypto.js');
      const prev = decryptPayload(Buffer.from(stored.prevPayloadB64, 'base64')) as EmbedPayloadV2;
      if (prev?.meta) prevMeta = prev.meta;
    } catch {
      // Tampered or wrong-key → ignore, start fresh.
    }
  }

  const meta: CVMeta = {
    createdAt: prevMeta?.createdAt ?? now,
    lastEditAt: now,
    editCount: (prevMeta?.editCount ?? 0) + 1,
    lastSentEmail: customerEmail,
  };

  const signature = signCV(cv);
  const publicKey = getPublicKey();
  const pdf = await renderLimit(() => renderPdf(cv, { signature, publicKey, meta }));
  const filename = safeFilename(`${cv.personal.fullName || 'cv'}.pdf`);
  return { pdf, meta, filename };
}

/** Notify the owner of a paid sale, at most once per CV draft. Fire-and-forget:
    swallows its own errors so it can never break delivery or the webhook ACK.
    Dedupe is keyed on the store entry's `notified` flag (Stripe retries events);
    when the draft has expired we can't dedupe, so we ping anyway (rare). */
function notifyOwnerOnce(session: Stripe.Checkout.Session): void {
  const cvId = session.metadata?.cvId;
  const stored = cvId && ID_RE.test(cvId) ? store[cvId] : undefined;
  if (stored?.notified) return;
  if (stored) {
    stored.notified = true;
    saveStore(store);
  }
  void notifyOwnerOfSale({
    mode: session.metadata?.mode ?? null,
    amount: session.amount_total,
    currency: session.currency,
    method: session.payment_method_types?.[0] ?? null,
    sessionId: session.id,
    email: session.customer_details?.email ?? null,
  });
}

/** Idempotently render + email the paid PDF for a Checkout session. Used by
    the webhook (async methods) and as the email side-effect of /pdf. */
async function deliverForSession(session: Stripe.Checkout.Session): Promise<void> {
  if (BETA_MODE) {
    console.log('[deliver] beta mode — skipping PDF delivery');
    return;
  }
  const cvId = session.metadata?.cvId;
  if (!cvId || !ID_RE.test(cvId)) {
    console.warn('[deliver] session without valid cvId metadata');
    return;
  }
  const stored = store[cvId];
  if (!stored) {
    console.warn(`[deliver] cv ${cvId.slice(0, 8)}… not in store (expired draft?)`);
    return;
  }
  if (stored.delivered) return; // already emailed — idempotent

  // Deliver ONLY to the email collected by Stripe Checkout. We never fall back
  // to a stored/previous email: the buyer may type a different address on the
  // payment page, and that's the one that must receive the PDF.
  const customerEmail = session.customer_details?.email || null;
  if (!customerEmail) {
    console.warn(`[deliver] no email on session for cv ${cvId.slice(0, 8)}… — cannot deliver`);
    return;
  }

  // Claim delivery synchronously — BEFORE any await — so a concurrent caller
  // (webhook + /fulfill + /pdf can fire near-simultaneously for a card session)
  // sees `delivered` already set and bails, instead of both passing the check
  // above and sending twice. Released back to false on failure so Stripe's
  // webhook retry (and the user's download) can try again.
  stored.delivered = true;
  saveStore(store);

  const built = await buildPaidPdf(cvId, customerEmail);
  if (!built) {
    stored.delivered = false;
    saveStore(store);
    return;
  }

  const ok = await sendCvByEmail({
    to: customerEmail,
    pdf: built.pdf,
    filename: built.filename,
    fullName: stored.cv.personal.fullName,
  });
  if (!ok) {
    stored.delivered = false;
    saveStore(store);
  }
  console.log(`[deliver] email ${ok ? 'sent' : 'failed'} → ${redactEmail(customerEmail)} (cv ${cvId.slice(0, 8)}…)`);
}

app.post('/create-checkout-session', checkoutLimiter, async (req: Request, res: Response) => {
  if (BETA_MODE) return res.status(503).json({ error: 'Payments are in beta', beta: true });
  try {
    const { cvId, mode, customerEmail } = req.body as {
      cvId?: unknown; mode?: unknown; customerEmail?: unknown;
    };

    if (typeof cvId !== 'string' || !ID_RE.test(cvId)) {
      return res.status(400).json({ error: 'Invalid cvId' });
    }
    const safeMode: 'new' | 'update' = mode === 'update' ? 'update' : 'new';
    const safeEmail = (typeof customerEmail === 'string'
      && EMAIL_RE.test(customerEmail)
      && customerEmail.length < 256)
      ? customerEmail
      : undefined;

    const session = await stripe.checkout.sessions.create(
      buildCheckout({ cvId, mode: safeMode, customerEmail: safeEmail }),
    );
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout]', (err as Error).message);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

app.get('/verify-session/:sessionId', standardLimiter, async (req: Request, res: Response) => {
  const sid = req.params.sessionId;
  if (typeof sid !== 'string' || !STRIPE_SESSION_RE.test(sid)) {
    return res.status(400).json({ paid: false });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sid);
    res.json({ paid: session.payment_status === 'paid', status: session.payment_status });
  } catch (err) {
    console.error('[verify-session]', (err as Error).message);
    res.status(400).json({ error: safeErrorMessage(err) });
  }
});

/* ── /fulfill/:sessionId — email the PDF on payment ──────
   Called by the client the moment it returns to the Paid screen, so the buyer
   gets the email as soon as payment confirms — not only when they click
   download. Idempotent (deliverForSession guards on `delivered`) and shares
   that guard with the webhook and /pdf, so the email goes out exactly once.
   Uses the email collected by Stripe Checkout (session.customer_details). */
app.get('/fulfill/:sessionId', standardLimiter, async (req: Request, res: Response) => {
  if (BETA_MODE) return res.status(503).json({ delivered: false, beta: true });
  const sid = req.params.sessionId;
  if (typeof sid !== 'string' || !STRIPE_SESSION_RE.test(sid)) {
    return res.status(400).json({ delivered: false });
  }
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sid);
  } catch {
    return res.status(400).json({ delivered: false });
  }
  if (session.payment_status !== 'paid') {
    return res.status(202).json({ delivered: false, pending: true });
  }
  try {
    await deliverForSession(session);
  } catch (err) {
    console.error('[fulfill]', (err as Error).message);
    return res.status(500).json({ delivered: false, error: safeErrorMessage(err) });
  }
  const cvId = session.metadata?.cvId;
  const delivered = cvId && ID_RE.test(cvId) ? Boolean(store[cvId]?.delivered) : false;
  res.json({ delivered, email: session.customer_details?.email ?? null });
});

/* ── /pdf/:sessionId — the paywall + email delivery ────── */

app.get('/pdf/:sessionId', pdfLimiter, async (req: Request, res: Response) => {
  if (BETA_MODE) return res.status(503).json({ error: 'Payments are in beta', beta: true });
  try {
    const sessionId = req.params.sessionId;
    const cvId      = req.query.cv_id;

    if (typeof sessionId !== 'string' || !STRIPE_SESSION_RE.test(sessionId)) {
      return res.status(402).json({ error: 'Payment required' });
    }
    if (typeof cvId !== 'string' || !ID_RE.test(cvId)) {
      return res.status(400).json({ error: 'Missing cv_id' });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return res.status(402).json({ error: 'Payment required' });
    }
    // Async methods (Multibanco/MB WAY) return here still unpaid — the
    // customer pays later at an ATM/homebanking. The webhook delivers the PDF
    // by email once payment confirms; tell the client to show "pending".
    if (session.payment_status !== 'paid') {
      return res.status(202).json({ pending: true, status: session.payment_status || 'pending' });
    }

    const stored = store[cvId];
    if (!stored) return res.status(404).json({ error: 'CV not found' });

    // Deliver ONLY to the email collected by Stripe Checkout. We never fall back
  // to a stored/previous email: the buyer may type a different address on the
  // payment page, and that's the one that must receive the PDF.
  const customerEmail = session.customer_details?.email || null;

    const built = await buildPaidPdf(cvId, customerEmail);
    if (!built) return res.status(404).json({ error: 'CV not found' });
    const { pdf, meta, filename } = built;

    // Email once, even if the webhook also fires for this (card) session. Mark
    // delivered optimistically to shrink the double-send race window.
    if (customerEmail && !stored.delivered) {
      stored.delivered = true;
      saveStore(store);
      void sendCvByEmail({
        to: customerEmail,
        pdf,
        filename,
        fullName: stored.cv.personal.fullName,
      }).then((ok) => {
        console.log(`[mail] ${ok ? 'sent' : 'skipped/failed'} → ${redactEmail(customerEmail)}`);
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-CVeaver-Edit-Count', String(meta.editCount));
    res.setHeader('X-CVeaver-Created-At', meta.createdAt);
    if (customerEmail) res.setHeader('X-CVeaver-Last-Sent-Email', customerEmail);
    res.send(pdf);

    console.log(`[pdf] delivered ${pdf.length} B for cv ${cvId.slice(0, 8)}… (edit #${meta.editCount})`);
  } catch (err) {
    console.error('[pdf] error:', (err as Error).message);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* ── /decode-pdf — decrypt embedded payload (update flow) ── */

app.post('/decode-pdf', decodeLimiter, express.raw({ type: 'application/pdf', limit: '25mb' }), async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Missing PDF body' });
    }
    const payload = await readPayloadFromPdf(req.body);
    if (!payload) {
      return res.status(422).json({ error: 'Not a CVeaver PDF or tampered.' });
    }

    let verified = false;
    try {
      verified = payload.signature ? verifyCV(payload.cv, payload.signature) : false;
    } catch {
      verified = false;
    }

    // Validate the embedded CV before handing it back — defence in depth.
    const cleanCv = validateCV(payload.cv);
    if (!cleanCv) {
      return res.status(422).json({ error: 'Embedded CV failed validation' });
    }

    const { encryptPayload } = await import('./crypto.js');
    const prevPayloadB64 = Buffer.from(encryptPayload(payload)).toString('base64');

    res.json({
      cv: cleanCv,
      meta: payload.meta,
      verified,
      prevPayloadB64,
    });
  } catch (err) {
    console.error('[decode-pdf]', (err as Error).message);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* ── Dev-only PDF endpoint (no paywall, no meta increment) ── */

if (!IS_PROD) {
  /* Send a quick Resend smoke email — confirms RESEND_API_KEY + sender
     domain are wired correctly without going through the Stripe paywall. */
  app.get('/dev/test-email', async (req: Request, res: Response) => {
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: 'RESEND_API_KEY not configured' });
    }
    const to = String(req.query.to ?? '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'Pass ?to=email@example.com' });
    }
    const now = new Date().toISOString();
    const meta = { createdAt: now, lastEditAt: now, editCount: 1, lastSentEmail: to };
    const fakeCv: CVData = {
      version: 1, template: 'modern', accentColor: '#5b3a11',
      personal: { fullName: 'CVeaver Test', headline: 'Resend smoke', email: to, phone: '', location: '', website: '', linkedin: '', github: '' },
      summary: '', experience: [], education: [], skills: [], languages: [], projects: [], certificates: [],
    };
    const signature = signCV(fakeCv);
    const publicKey = getPublicKey();
    const pdf = await renderLimit(() => renderPdf(fakeCv, { meta, signature, publicKey }));
    const ok = await sendCvByEmail({ to, pdf, filename: 'cveaver-test.pdf', fullName: 'CVeaver Test' });
    res.json({ ok, to });
  });

  app.post('/dev/pdf', async (req: Request, res: Response) => {
    try {
      const body = req.body as { cv?: unknown; customerEmail?: unknown };
      const cv = validateCV(body?.cv);
      if (!cv) return res.status(400).json({ error: 'Invalid CV shape' });

      const rawEmail = typeof body.customerEmail === 'string' ? body.customerEmail : '';
      const customerEmail = (rawEmail && EMAIL_RE.test(rawEmail) && rawEmail.length < 256) ? rawEmail : null;

      const now = new Date().toISOString();
      const meta = { createdAt: now, lastEditAt: now, editCount: 1, lastSentEmail: customerEmail };
      const signature = signCV(cv);
      const publicKey = getPublicKey();
      const pdf = await renderLimit(() => renderPdf(cv, { meta, signature, publicKey }));

      const filename = safeFilename(`${cv.personal.fullName || 'cv'}.pdf`);

      // Fire email in the background — don't block the download response.
      if (customerEmail) {
        void sendCvByEmail({
          to: customerEmail,
          pdf,
          filename,
          fullName: cv.personal.fullName,
        }).then((ok) => {
          console.log(`[dev/mail] ${ok ? 'sent' : 'skipped/failed'} → ${redactEmail(customerEmail)}`);
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-CVeaver-Edit-Count', String(meta.editCount));
      res.setHeader('X-CVeaver-Created-At', meta.createdAt);
      if (customerEmail) res.setHeader('X-CVeaver-Last-Sent-Email', customerEmail);
      res.send(pdf);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });
  console.log('[server] /dev/pdf enabled (NODE_ENV !== production)');
}

/* ── Public key (offline verifiers) ─────────────────────── */

app.get('/public-key', standardLimiter, (_req, res) => res.json(getPublicKey()));

/* ── Support / complaints ─────────────────────────────── */

const COMPLAINTS_FILE = join(DATA_DIR, 'complaints.json');

interface ComplaintEntry {
  id: string;
  receivedAt: string;
  email: string;
  subject: string;
  message: string;
  keyId: string | null;
  hash: string | null;
  signedAt: string | null;
  author: string;
  ip: string | undefined;
}

function loadComplaints(): ComplaintEntry[] {
  try {
    if (!existsSync(COMPLAINTS_FILE)) return [];
    return JSON.parse(readFileSync(COMPLAINTS_FILE, 'utf8'));
  } catch { return []; }
}

function appendComplaint(entry: ComplaintEntry): void {
  const list = loadComplaints();
  list.push(entry);
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(COMPLAINTS_FILE, JSON.stringify(list));
  } catch (err) {
    console.error('Complaint write failed:', (err as Error).message);
  }
}

app.post('/support', supportLimiter, (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const email   = typeof body.email   === 'string' ? body.email.slice(0, 256)   : '';
    const subject = typeof body.subject === 'string' ? body.subject.slice(0, 256) : '';
    const message = typeof body.message === 'string' ? body.message.slice(0, 8 * 1024) : '';
    const author  = typeof body.author  === 'string' ? body.author.slice(0, 256)  : '';
    const keyId    = typeof body.keyId    === 'string' && body.keyId.length    < 256 ? body.keyId    : null;
    const hash     = typeof body.hash     === 'string' && body.hash.length     < 256 ? body.hash     : null;
    const signedAt = typeof body.signedAt === 'string' && body.signedAt.length < 64  ? body.signedAt : null;

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!subject || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (message.length > 8 * 1024) {
      return res.status(413).json({ error: 'Message too large' });
    }

    const id = randomId();
    const entry: ComplaintEntry = {
      id,
      receivedAt: new Date().toISOString(),
      email, subject, message, keyId, hash, signedAt, author,
      ip: req.ip,
    };
    appendComplaint(entry);
    console.log(`[support] complaint ${id.slice(0, 8)}… from ${redactEmail(email)} re ${keyId?.slice(0, 12) ?? 'unknown'}`);
    res.json({ ok: true, id });
  } catch (err) {
    console.error('[support]', (err as Error).message);
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

app.post('/verify-pdf', standardLimiter, (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.cv || typeof body.cv !== 'object') return res.status(400).json({ error: 'Missing cv' });
    if (!body.signature) return res.json({ valid: false });
    res.json({ valid: verifyCV(body.cv, body.signature) });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

/* ── Error handler ─────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err.message);
  res.status(500).json({ error: safeErrorMessage(err) });
});

/* ── Periodic store prune ───────────────────────────────── */
setInterval(() => {
  const before = Object.keys(store).length;
  store = pruneStore(store);
  if (Object.keys(store).length !== before) saveStore(store);
}, 60 * 60 * 1000).unref(); // hourly, don't keep the event loop alive

/* ── Listen ────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CVeaver server :${PORT}`);
  console.log(`store: ${DATA_FILE}`);
  console.log(`payment methods: ${PAYMENT_METHODS ? PAYMENT_METHODS.join(', ') : 'dynamic (Stripe Dashboard)'}`);
  console.log(`beta mode: ${BETA_MODE ? 'ON — PDF generation disabled' : 'off'}`);
  console.log(`env: ${IS_PROD ? 'production' : 'development'}`);
});
