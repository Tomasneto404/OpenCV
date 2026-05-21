import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { signCV, verifyCV, getPublicKey } from './sign.js';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = process.env.DATA_DIR || join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'cvs.json');

const PRICE_NEW_CENTS    = 100; // €1.00
const PRICE_UPDATE_CENTS = 50;  // €0.50

const ALLOWED_METHODS = new Set(['card', 'multibanco', 'mb_way']);
const PAYMENT_METHODS = (process.env.STRIPE_PAYMENT_METHODS || 'card,multibanco')
  .split(',')
  .map((m) => m.trim())
  .filter((m) => ALLOWED_METHODS.has(m));

/* ── Persistent store ──────────────────────────────────── */
function loadStore() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(DATA_FILE)) return {};
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(data) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(data));
  } catch (err) {
    console.error('Store write failed:', err.message);
  }
}

let store = loadStore();

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Express ───────────────────────────────────────────── */
const app    = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: '4mb' })); // base64 photo / logo

app.get('/health', (_req, res) => res.json({ ok: true, service: 'cveaver' }));

/* ── CV store ──────────────────────────────────────────── */
app.post('/cv', (req, res) => {
  try {
    const { cv } = req.body;
    if (!cv) return res.status(400).json({ error: 'Missing cv' });

    const id = generateId();
    store[id] = { ...cv, savedAt: Date.now() };
    saveStore(store);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cv/:id', (req, res) => {
  const cv = store[req.params.id];
  if (!cv) return res.status(404).json({ error: 'Not found' });
  res.json(cv);
});

/* ── Stripe Checkout ───────────────────────────────────── */
function buildCheckout({ cvId, mode }) {
  const isUpdate = mode === 'update';
  const amount   = isUpdate ? PRICE_UPDATE_CENTS : PRICE_NEW_CENTS;
  const label    = isUpdate ? 'CVeaver — Update CV (PDF download)' : 'CVeaver — New CV (PDF download)';
  const desc     = isUpdate
    ? 'Atualizar CV existente — descarrega o novo PDF e o ficheiro de configuração.'
    : 'Gera um CV profissional — PDF + ficheiro de configuração para futuras atualizações.';

  return {
    payment_method_types: PAYMENT_METHODS,
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
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { cvId, mode } = req.body;
    if (!cvId) return res.status(400).json({ error: 'Missing cvId' });
    const session = await stripe.checkout.sessions.create(buildCheckout({ cvId, mode }));
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const paid = session.payment_status === 'paid';
    const out = { paid, status: session.payment_status };

    if (paid) {
      const cvId = req.query.cv_id;
      const cv = cvId ? store[cvId] : null;
      if (cv) {
        const { savedAt: _savedAt, ...clean } = cv;
        out.signature = signCV(clean);
        out.publicKey = getPublicKey();
      }
    }

    res.json(out);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/public-key', (_req, res) => {
  res.json(getPublicKey());
});

/* ── Support / complaints ─────────────────────────────── */

/**
 * Stores received complaints in DATA_DIR/complaints.json.
 * Keep payload modest — we cap message size to 8 KB and never log full bodies
 * in normal mode (only the metadata).
 */
const COMPLAINTS_FILE = join(DATA_DIR, 'complaints.json');

function loadComplaints() {
  try {
    if (!existsSync(COMPLAINTS_FILE)) return [];
    return JSON.parse(readFileSync(COMPLAINTS_FILE, 'utf8'));
  } catch { return []; }
}

function appendComplaint(entry) {
  const list = loadComplaints();
  list.push(entry);
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(COMPLAINTS_FILE, JSON.stringify(list));
  } catch (err) {
    console.error('Complaint write failed:', err.message);
  }
}

app.post('/support', (req, res) => {
  try {
    const { email, subject, message, keyId, hash, signedAt, author } = req.body || {};
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (String(message).length > 8 * 1024) {
      return res.status(413).json({ error: 'Message too large' });
    }
    const id = generateId();
    const entry = {
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/verify-pdf', (req, res) => {
  try {
    const { cv, signature } = req.body || {};
    if (!cv || typeof cv !== 'object') return res.status(400).json({ error: 'Missing cv' });
    if (!signature) {
      return res.json({ valid: false, reason: 'unsigned' });
    }
    const ok = verifyCV(cv, signature);
    res.json({
      valid: ok,
      reason: ok ? null : 'signature-mismatch',
      keyId:    signature.keyId    ?? null,
      signedAt: signature.signedAt ?? null,
      hash:     signature.hash     ?? null,
      algorithm: signature.algorithm ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Listen ────────────────────────────────────────────── */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CVeaver server :${PORT}`);
  console.log(`store: ${DATA_FILE}`);
  console.log(`payment methods: ${PAYMENT_METHODS.join(', ') || '(none configured)'}`);
});
