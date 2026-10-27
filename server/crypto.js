import './env.js';
/** AES-256-GCM for the editable payload inside exported PDFs.
 * Keep server/keys (or SIGN_KEY_DIR) backed up to reopen existing PDFs.
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_DIR = process.env.SIGN_KEY_DIR || join(__dirname, 'keys');
const KEY_PATH = join(KEY_DIR, 'aes.key');

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function loadOrGenerateKey() {
  if (process.env.PAYLOAD_AES_KEY_B64) {
    return Buffer.from(process.env.PAYLOAD_AES_KEY_B64, 'base64');
  }
  if (!existsSync(KEY_DIR)) mkdirSync(KEY_DIR, { recursive: true });
  if (existsSync(KEY_PATH)) {
    return readFileSync(KEY_PATH);
  }
  console.log('[crypto] generating new AES-256 key → ' + KEY_DIR);
  const key = randomBytes(32);
  writeFileSync(KEY_PATH, key, { mode: 0o600 });
  return key;
}

const KEY = loadOrGenerateKey();

/**
 * Encrypt an arbitrary JSON-serialisable value into a self-contained Buffer.
 *
 * Output layout: 1 byte version (1) | 12 bytes IV | ciphertext | 16 bytes auth tag.
 * Versioned so we can rotate algorithms without losing old PDFs.
 */
export function encryptPayload(obj) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, ciphertext, tag]);
}

/**
 * Decrypt the buffer produced by encryptPayload. Throws on bad format,
 * version mismatch, or auth-tag failure (tampering / wrong key).
 */
export function decryptPayload(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length < 1 + IV_BYTES + TAG_BYTES) throw new Error('Payload too short');
  const version = buf[0];
  if (version !== 1) throw new Error(`Unsupported payload version ${version}`);
  const iv = buf.subarray(1, 1 + IV_BYTES);
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const ciphertext = buf.subarray(1 + IV_BYTES, buf.length - TAG_BYTES);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}
