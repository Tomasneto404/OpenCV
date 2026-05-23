/**
 * Client-side PDF helpers — fetch wrappers around the server endpoints.
 *
 * The actual rendering, encryption and email delivery happen server-side
 * (see server/pdf/render.ts + server/mail.ts). This module just hits the
 * endpoints and triggers a browser download.
 */
import type { CVData, CVMeta } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

interface DownloadOptions {
  filename: string;
}

export interface PaidPdfResult {
  /** Server-returned meta (parsed from X-CVeaver-* headers). */
  meta: CVMeta | null;
}

/**
 * Download the paid PDF for a Stripe-confirmed session. The server enforces
 * payment; on success it also emails the PDF to the buyer's email.
 *
 * Returns the meta block extracted from response headers — used to render
 * the badge/rank UI on the Paid screen.
 */
export async function downloadPaidPdf(sessionId: string, cvId: string, { filename }: DownloadOptions): Promise<PaidPdfResult> {
  // FIXME: TEST MODE — when App.tsx sets sessionId='TEST', skip the paywall
  // and call /dev/pdf instead. Remove this branch when re-enabling Stripe.
  // We also pass cv.personal.email as customerEmail so the dev endpoint can
  // exercise the real Resend → inbox flow in test mode.
  if (sessionId === 'TEST') {
    const cvRes = await fetch(`${API_URL}/cv/${encodeURIComponent(cvId)}`);
    if (!cvRes.ok) throw new Error(`Could not load CV (${cvRes.status})`);
    const cv = await cvRes.json();
    const customerEmail = typeof cv?.personal?.email === 'string' ? cv.personal.email : undefined;
    const pdfRes = await fetch(`${API_URL}/dev/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, customerEmail }),
    });
    if (!pdfRes.ok) throw new Error(`Server returned ${pdfRes.status}`);
    const meta = parseMetaHeaders(pdfRes.headers);
    await triggerDownload(await pdfRes.blob(), filename);
    return { meta };
  }

  const url = `${API_URL}/pdf/${encodeURIComponent(sessionId)}?cv_id=${encodeURIComponent(cvId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 402) throw new Error('Payment required.');
    if (res.status === 429) throw new Error('Demasiados pedidos. Espera 1 minuto.');
    throw new Error(`Server returned ${res.status}`);
  }
  const meta = parseMetaHeaders(res.headers);
  const blob = await res.blob();
  await triggerDownload(blob, filename);
  return { meta };
}

/** Dev-only render — disabled in production builds (server also enforces). */
export async function downloadDevPdf(cv: CVData, { filename }: DownloadOptions): Promise<void> {
  if (!import.meta.env.DEV) throw new Error('Dev PDF disabled in production.');
  const res = await fetch(`${API_URL}/dev/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cv }),
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  await triggerDownload(await res.blob(), filename);
}

function parseMetaHeaders(h: Headers): CVMeta | null {
  const editStr  = h.get('X-CVeaver-Edit-Count');
  const created  = h.get('X-CVeaver-Created-At');
  if (!editStr || !created) return null;
  const editCount = Number(editStr);
  if (!Number.isFinite(editCount)) return null;
  return {
    createdAt: created,
    lastEditAt: new Date().toISOString(),
    editCount,
    lastSentEmail: h.get('X-CVeaver-Last-Sent-Email') ?? null,
  };
}

async function triggerDownload(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
