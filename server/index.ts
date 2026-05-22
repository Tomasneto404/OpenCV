/**
 * CVeaver server.
 *
 * Surface:
 *   POST /cv                       — stash a CV draft, returns id
 *   GET  /cv/:id                   — read it back (after Stripe roundtrip)
 *   POST /create-checkout-session  — Stripe Checkout creation
 *   GET  /verify-session/:sessionId — Stripe status only (no signature
 *                                    surfaced to the client; signing is
 *                                    purely internal from Sessão 22)
 *   GET  /pdf/:sessionId?cv_id=X   — **PAYWALLED**. Renders, encrypts the
 *                                    embedded payload, signs internally,
 *                                    emails it to customer, returns the PDF
 *   POST /decode-pdf               — decrypt an uploaded PDF's payload so
 *                                    the update flow can re-populate the
 *                                    builder. Used only by the client.
 *   POST /support                  — file a complaint (CV-bound)
 *   POST /verify-pdf               — internal-style verifier used by
 *                                    /support; returns simplified bool
 *   GET  /health                   — liveness probe
 *
 * The /pdf endpoint is the centrepiece of the paywall: the only way a
 * user gets a finished PDF is through Stripe confirming payment.
 * The renderer + encryption key live only here.
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
import type { CVData, CVMeta, EmbedPayloadV2 } from './types.ts';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = process.env.DATA_DIR || join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'cvs.json');

const PRICE_NEW_CENTS    = 100;
const PRICE_UPDATE_CENTS = 50;

const ALLOWED_METHODS = new Set(['card', 'multibanco', 'mb_way']);
const PAYMENT_METHODS = (process.env.STRIPE_PAYMENT_METHODS || 'card,multibanco')
  .split(',')
  .map((m) => m.trim())
  .filter((m) => ALLOWED_METHODS.has(m));

const IS_PROD = process.env.NODE_ENV === 'production';

/* ── Persistent store ──────────────────────────────────── */

interface StoreEntry {
  cv: CVData;
  /** When this draft was last touched server-side. */
  savedAt: number;
  /** Encrypted payload (base64) from a previous PDF, if this is an update.
   *  Used by /pdf to recover meta.editCount/createdAt deterministically. */
  prevPayloadB64?: string;
  /** Pre-filled customer email passed to Stripe Checkout. */
  customerEmail?: string;
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

function saveStore(data: Store): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(data));
  } catch (err) {
    console.error('Store write failed:', (err as Error).message);
  }
}

let store = loadStore();

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ── Express ───────────────────────────────────────────── */

const app    = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // enforced at the client host
}));

app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: '60mb' })); // photo + up to ~50 MB of certs
/* /decode-pdf accepts the raw PDF bytes — registered just on that route. */

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
    const { cv, prevPayloadB64, customerEmail } = req.body as {
      cv?: CVData;
      prevPayloadB64?: string;
      customerEmail?: string;
    };
    if (!cv) return res.status(400).json({ error: 'Missing cv' });

    const id = generateId();
    const entry: StoreEntry = { cv, savedAt: Date.now() };
    if (prevPayloadB64) entry.prevPayloadB64 = prevPayloadB64;
    if (customerEmail)  entry.customerEmail  = customerEmail;
    store[id] = entry;
    saveStore(store);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/cv/:id', standardLimiter, (req: Request, res: Response) => {
  const entry = store[req.params.id];
  if (!entry) return res.status(404).json({ error: 'Not found' });
  // Only return the CV body — never the prev payload or stored email.
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
    payment_method_types: PAYMENT_METHODS as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: label, description: desc },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${clientUrl}?success=true&session_id={CHECKOUT_SESSION_ID}&cv_id=${cvId}&kind=${isUpdate ? 'update' : 'new'}`,
    cancel_url:  `${clientUrl}?canceled=true`,
  };
  if (customerEmail) params.customer_email = customerEmail;
  return params;
}

app.post('/create-checkout-session', checkoutLimiter, async (req: Request, res: Response) => {
  try {
    const { cvId, mode, customerEmail } = req.body as {
      cvId?: string; mode?: 'new' | 'update'; customerEmail?: string;
    };
    if (!cvId) return res.status(400).json({ error: 'Missing cvId' });
    const session = await stripe.checkout.sessions.create(buildCheckout({ cvId, mode, customerEmail }));
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * Tell the client whether the payment is settled. Used by App.tsx on the
 * Stripe return URL. We deliberately do NOT include the signature/publicKey
 * in the response from Sessão 22 — that's internal-only now.
 */
app.get('/verify-session/:sessionId', standardLimiter, async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({ paid: session.payment_status === 'paid', status: session.payment_status });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/* ── /pdf/:sessionId — the paywall + email delivery ────── */

app.get('/pdf/:sessionId', pdfLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const cvId = req.query.cv_id as string | undefined;
    if (!cvId) return res.status(400).json({ error: 'Missing cv_id' });

    // 1. Confirm payment. Stripe throws on bad ids — we map to 402 so the
    //    response is consistent and doesn't leak existence.
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return res.status(402).json({ error: 'Payment required' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment required', status: session.payment_status });
    }

    // 2. Load the saved CV + any prior payload (for update flow).
    const stored = store[cvId];
    if (!stored) return res.status(404).json({ error: 'CV not found' });
    const cv = stored.cv;

    // 3. Compute meta — preserve createdAt + editCount from prev payload
    //    if this is a verified update.
    const now = new Date().toISOString();
    const customerEmail = session.customer_details?.email || stored.customerEmail || null;

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

    // 4. Sign internally + render. Signature/publicKey go INTO the payload
    //    (for /support to verify later) but are never returned to the
    //    client. They never appear on the user-facing UI.
    const signature = signCV(cv);
    const publicKey = getPublicKey();
    const pdf = await renderLimit(() =>
      renderPdf(cv, { signature, publicKey, meta }),
    );

    const filename = `${slugify(cv.personal.fullName) || 'cv'}.pdf`;

    // 5. Email best-effort. Don't block the download if SMTP is down.
    if (customerEmail) {
      void sendCvByEmail({
        to: customerEmail,
        pdf,
        filename,
        fullName: cv.personal.fullName,
      }).then((ok) => {
        console.log(`[mail] ${ok ? 'sent' : 'skipped/failed'} → ${customerEmail}`);
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    /* Tell the client the new editCount so it can show the badge without
       a second round-trip. Non-sensitive so safe to leak. */
    res.setHeader('X-CVeaver-Edit-Count', String(meta.editCount));
    res.setHeader('X-CVeaver-Created-At', meta.createdAt);
    if (customerEmail) res.setHeader('X-CVeaver-Last-Sent-Email', customerEmail);
    res.send(pdf);

    console.log(`[pdf] delivered ${pdf.length} B for cv ${cvId} (edit #${meta.editCount})`);
  } catch (err) {
    console.error('[pdf] error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
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

    /* Verify internal signature silently. Only return a boolean to the
       client — never the keyId/hash/algorithm. */
    let verified = false;
    try {
      verified = payload.signature ? verifyCV(payload.cv, payload.signature) : false;
    } catch {
      verified = false;
    }

    // Repackage the original ciphertext for the client to send back
    // unchanged when it eventually creates the next /cv draft. This
    // preserves the tamper-evidence chain.
    const { encryptPayload } = await import('./crypto.js');
    const prevPayloadB64 = Buffer.from(encryptPayload(payload)).toString('base64');

    res.json({
      cv: payload.cv,
      meta: payload.meta,
      verified,
      prevPayloadB64,
    });
  } catch (err) {
    console.error('[decode-pdf] error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Dev-only PDF endpoint (no paywall, no meta increment) ── */

if (!IS_PROD) {
  app.post('/dev/pdf', async (req: Request, res: Response) => {
    try {
      const { cv } = req.body as { cv?: CVData };
      if (!cv) return res.status(400).json({ error: 'Missing cv' });
      const now = new Date().toISOString();
      const meta = { createdAt: now, lastEditAt: now, editCount: 1, lastSentEmail: null };
      // Sign internally so the update flow recognises this PDF when the
      // user re-uploads it (otherwise /decode-pdf returns verified=false).
      const signature = signCV(cv);
      const publicKey = getPublicKey();
      const pdf = await renderLimit(() => renderPdf(cv, { meta, signature, publicKey }));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dev-${Date.now()}.pdf"`);
      /* Mirror /pdf headers so the client's downloadPaidPdf gets a meta
         in TEST mode too — drives the Badge UI without Stripe. */
      res.setHeader('X-CVeaver-Edit-Count', String(meta.editCount));
      res.setHeader('X-CVeaver-Created-At', meta.createdAt);
      res.send(pdf);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
  console.log('[server] /dev/pdf enabled (NODE_ENV !== production)');
}

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
    const { email, subject, message, keyId, hash, signedAt, author } = req.body || {};
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (String(message).length > 8 * 1024) {
      return res.status(413).json({ error: 'Message too large' });
    }
    const id = generateId();
    const entry: ComplaintEntry = {
      id,
      receivedAt: new Date().toISOString(),
      email:    String(email).slice(0, 256),
      subject:  String(subject).slice(0, 256),
      message:  String(message).slice(0, 8 * 1024),
      keyId:    keyId ?? null,
      hash:     hash ?? null,
      signedAt: signedAt ?? null,
      author:   String(author ?? '').slice(0, 256),
      ip:       req.ip,
    };
    appendComplaint(entry);
    console.log(`[support] complaint ${id} from ${entry.email} re ${entry.keyId ?? 'unknown-key'}`);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * Simplified verifier for the /support page. Returns only a boolean — no
 * keyId, hash or algorithm leak so the user-facing UI can't show signature
 * detail (per Sessão 22 requirement).
 */
app.post('/verify-pdf', standardLimiter, (req: Request, res: Response) => {
  try {
    const { cv, signature } = req.body || {};
    if (!cv || typeof cv !== 'object') return res.status(400).json({ error: 'Missing cv' });
    if (!signature) return res.json({ valid: false });
    res.json({ valid: verifyCV(cv, signature) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Error handler ─────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err.message);
  res.status(500).json({ error: 'Internal error' });
});

/* ── Listen ────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CVeaver server :${PORT}`);
  console.log(`store: ${DATA_FILE}`);
  console.log(`payment methods: ${PAYMENT_METHODS.join(', ') || '(none configured)'}`);
  console.log(`env: ${IS_PROD ? 'production' : 'development'}`);
});
