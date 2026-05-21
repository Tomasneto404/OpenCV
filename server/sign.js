import { generateKeyPairSync, sign, verify, createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_DIR = process.env.SIGN_KEY_DIR || join(__dirname, 'keys');
const PRIV_PATH = join(KEY_DIR, 'ed25519.private.pem');
const PUB_PATH  = join(KEY_DIR, 'ed25519.public.pem');

const SIGN_VERSION = 1;

/**
 * Deterministic JSON: keys sorted, no extra whitespace, no undefined fields.
 * Both signer and verifier must produce the exact same bytes.
 */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

function loadOrGenerateKeypair() {
  if (process.env.SIGN_PRIVATE_KEY_PEM) {
    const priv = createPrivateKey(process.env.SIGN_PRIVATE_KEY_PEM);
    const pub  = createPublicKey(priv);
    return { priv, pub };
  }

  if (!existsSync(KEY_DIR)) mkdirSync(KEY_DIR, { recursive: true });

  if (existsSync(PRIV_PATH) && existsSync(PUB_PATH)) {
    const priv = createPrivateKey(readFileSync(PRIV_PATH));
    const pub  = createPublicKey(readFileSync(PUB_PATH));
    return { priv, pub };
  }

  console.log('[sign] generating new Ed25519 keypair → ' + KEY_DIR);
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  writeFileSync(PRIV_PATH, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  writeFileSync(PUB_PATH,  publicKey.export({ format: 'pem', type: 'spki' }));
  return { priv: privateKey, pub: publicKey };
}

const { priv, pub } = loadOrGenerateKeypair();

const publicKeyDerB64 = pub.export({ format: 'der', type: 'spki' }).toString('base64');
const publicKeyPem    = pub.export({ format: 'pem', type: 'spki' }).toString();
export const KEY_ID = createHash('sha256').update(publicKeyDerB64, 'base64').digest('hex').slice(0, 16);

export function signCV(cv) {
  const canonical = canonicalize(cv);
  const bytes = Buffer.from(canonical, 'utf8');
  const sig = sign(null, bytes, priv);
  const hash = createHash('sha256').update(bytes).digest('hex');
  return {
    version:    SIGN_VERSION,
    algorithm:  'ed25519',
    keyId:      KEY_ID,
    signedAt:   new Date().toISOString(),
    hash,
    signatureB64: sig.toString('base64'),
  };
}

export function verifyCV(cv, envelope) {
  if (!envelope || envelope.algorithm !== 'ed25519') return false;
  const canonical = canonicalize(cv);
  const bytes = Buffer.from(canonical, 'utf8');
  try {
    const sig = Buffer.from(envelope.signatureB64, 'base64');
    return verify(null, bytes, pub, sig);
  } catch {
    return false;
  }
}

export function getPublicKey() {
  return {
    keyId: KEY_ID,
    algorithm: 'ed25519',
    publicKeyPem,
    publicKeyDerB64,
  };
}
