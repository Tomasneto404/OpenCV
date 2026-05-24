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
import type { CVData, CertificateItem } from './types.js';

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
export function validateCV(input: unknown): CVData | null {
  if (!input || typeof input !== 'object') return null;
  const cv = input as Record<string, unknown>;

  if (cv.version !== 1) return null;
  if (typeof cv.template !== 'string') return null;
  const allowedTemplates = ['modern', 'classic', 'minimal', 'creative', 'executive', 'compact'];
  if (!allowedTemplates.includes(cv.template)) return null;

  // accentColor must be a hex literal — anything else and we refuse so
  // it never reaches drawText / Stylesheet via accent prop.
  if (cv.accentColor !== undefined && !isHexColor(cv.accentColor)) return null;

  if (!cv.personal || typeof cv.personal !== 'object') return null;
  const p = cv.personal as Record<string, unknown>;
  const personalFields = ['fullName', 'headline', 'email', 'phone', 'location', 'website', 'linkedin', 'github'];
  for (const f of personalFields) {
    if (p[f] !== undefined && typeof p[f] !== 'string') return null;
    if (typeof p[f] === 'string' && (p[f] as string).length > 512) return null;
  }
  // photoDataUrl can be a long base64 — cap at ~6 MB string (≈4.5 MB raw)
  if (p.photoDataUrl !== undefined) {
    if (typeof p.photoDataUrl !== 'string') return null;
    if (!(p.photoDataUrl as string).startsWith('data:image/')) return null;
    if ((p.photoDataUrl as string).length > 6 * 1024 * 1024) return null;
  }

  // Arrays — sanity-check length so a 10 000-item array can't OOM us.
  const arrayFields: Array<[string, number]> = [
    ['experience', 50], ['education', 20], ['skills', 50],
    ['languages', 30], ['projects', 50], ['certificates', 50],
  ];
  for (const [field, max] of arrayFields) {
    const v = cv[field];
    if (v !== undefined && !Array.isArray(v)) return null;
    if (Array.isArray(v) && v.length > max) return null;
  }

  // Certificates: each must look like a PDF data URL with sane size.
  if (Array.isArray(cv.certificates)) {
    for (const c of cv.certificates as unknown[]) {
      if (!c || typeof c !== 'object') return null;
      const cert = c as Record<string, unknown>;
      if (typeof cert.pdfDataUrl !== 'string') return null;
      if (!cert.pdfDataUrl.startsWith('data:application/pdf')) return null;
      // 15 MB per cert hard ceiling (slightly above the UI's 10 MB) so
      // legit certs at the edge still pass.
      if (cert.pdfDataUrl.length > 15 * 1024 * 1024) return null;
      if (typeof cert.name !== 'string' || cert.name.length > 256) return null;
    }
  }

  if (cv.summary !== undefined && typeof cv.summary !== 'string') return null;
  if (typeof cv.summary === 'string' && cv.summary.length > 4096) return null;

  // Locale must be one of the supported codes if present.
  if (cv.locale !== undefined) {
    if (typeof cv.locale !== 'string') return null;
    if (!['pt', 'en', 'es', 'fr', 'de'].includes(cv.locale)) return null;
  }

  return cv as unknown as CVData;
}

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
    if (typeof c.bytes === 'number') total += c.bytes;
    else total += (c.pdfDataUrl?.length ?? 0) * 0.75; // base64 → raw approx
    if (total > capBytes) return false;
  }
  return true;
}
