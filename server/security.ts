/**
 * Server-side security helpers — OWASP-conscious building blocks.
 *
 * Used across server/index.ts:
 *   - randomId() / randomToken() — cryptographically strong IDs in place
 *     of Math.random() (A02: Cryptographic Failures).
 *   - validateCV() — minimal shape check so a malformed body can't slip
 *     into the render pipeline (A03: Injection / A04: Insecure Design).
 *   - safeFilename() — Content-Disposition value scrubbing (A03).
 *   - safeErrorMessage() — never echoes internal err.message in prod
 *     (A05: Security Misconfiguration / A09: Logging failures).
 *   - redactEmail() — partial mask for logs (A09).
 */
import { randomBytes } from 'node:crypto';
import type { CertificateItem } from './types.js';

/** 128 bits of entropy as 32-char hex. Practically un-guessable. */
export function randomId(): string {
  return randomBytes(16).toString('hex');
}

/** Hex (#rrggbb) validator — used to gate accentColor before it hits
 *  the PDF renderer's rgb() / drawText calls. */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_RE.test(v);
}

/** Best-effort shape validator. Rejects clearly malformed bodies before
 *  we attempt to encrypt them inside the PDF. Doesn't try to be a full
 *  schema validator — pdf-lib + react-pdf are forgiving enough that
 *  loose CV objects render gracefully, but we want to catch the obvious
 *  injection / DoS shapes. */
export { normalizeCV as validateCV } from '../shared/normalizeCV.ts';

/** Make a string safe to put inside a Content-Disposition filename="..."
 *  value. Strips quotes, control chars, slashes, and non-ASCII. */
export function safeFilename(name: string, fallback = 'cv'): string {
  if (typeof name !== 'string') return `${fallback}.pdf`;
  const cleaned = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')           // strip combining marks
    .replace(/[^A-Za-z0-9._-]+/g, '-')         // alnum + . _ - only
    .replace(/^[.-]+|[.-]+$/g, '')             // trim leading/trailing
    .slice(0, 80);
  return cleaned || fallback;
}

const IS_PROD = process.env.NODE_ENV === 'production';

/** Returns a message safe to send to the client. In production this is
 *  always a generic "Internal error" so we don't leak internals; in dev
 *  we echo the message to make local debugging painless. */
export function safeErrorMessage(err: unknown): string {
  if (IS_PROD) return 'Internal error';
  return err instanceof Error ? err.message : String(err);
}

/** Mask an email for logs: keeps first char + domain. */
export function redactEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '-';
  const [user, domain] = email.split('@', 2);
  if (!user || !domain) return '-';
  return `${user[0]}***@${domain}`;
}

/** Validate the certificate array's combined size doesn't exceed the cap
 *  (defence in depth — the client also enforces 50 MB but a hand-crafted
 *  request must be capped here too). */
export function withinCertSizeCap(certs: CertificateItem[] | undefined, capBytes = 60 * 1024 * 1024): boolean {
  if (!certs) return true;
  let total = 0;
  for (const c of certs) {
    total += (c.pdfDataUrl?.split(',')[1]?.length ?? 0) * 0.75; // base64 → raw approx
    if (total > capBytes) return false;
  }
  return true;
}
