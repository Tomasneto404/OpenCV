/**
 * Thin REST helpers against the server. All endpoints are documented in
 * server/index.ts. Nothing here is sensitive enough to deserve a class —
 * everything is a plain async function.
 */
import type { CVData } from './types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

/** Save a draft CV server-side. Optional `prevPayloadB64` chains the
 *  editCount/createdAt across an update. Optional `customerEmail` is used
 *  by Stripe Checkout to pre-fill the buyer's email field. */
export async function saveCV(cv: CVData, opts?: { prevPayloadB64?: string; customerEmail?: string }): Promise<string> {
  const res = await fetch(`${API_URL}/cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cv, ...opts }),
  });
  if (!res.ok) throw new Error('Falha ao guardar CV');
  const json = await res.json();
  return json.id as string;
}

export async function fetchCV(id: string): Promise<CVData> {
  const res = await fetch(`${API_URL}/cv/${id}`);
  if (!res.ok) throw new Error('CV não encontrado');
  return res.json();
}

export async function createCheckout(cvId: string, mode: 'new' | 'update', customerEmail?: string): Promise<string> {
  const res = await fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cvId, mode, customerEmail }),
  });
  if (!res.ok) throw new Error('Falha a criar sessão de pagamento');
  const json = await res.json();
  return json.url as string;
}

export interface VerifyResult {
  paid: boolean;
  /** Stripe payment_status: 'paid' | 'unpaid' | 'no_payment_required'.
   *  Undefined when the session couldn't be retrieved. For async methods
   *  (Multibanco/MB WAY) the buyer returns with 'unpaid' until they pay. */
  status?: string;
}

export async function verifySession(sessionId: string): Promise<VerifyResult> {
  const res = await fetch(`${API_URL}/verify-session/${sessionId}`);
  if (!res.ok) return { paid: false };
  const json = await res.json();
  return {
    paid: Boolean(json.paid),
    status: typeof json.status === 'string' ? json.status : undefined,
  };
}

/**
 * Trigger PDF delivery by email for a paid session. Called on the Paid screen
 * so the buyer is emailed the moment payment confirms — not only on download.
 * Idempotent server-side. Returns the email Stripe collected at checkout.
 */
export async function fulfillSession(sessionId: string): Promise<{ delivered: boolean; email: string | null }> {
  const res = await fetch(`${API_URL}/fulfill/${sessionId}`);
  if (!res.ok) return { delivered: false, email: null };
  const json = await res.json();
  return {
    delivered: Boolean(json.delivered),
    email: typeof json.email === 'string' ? json.email : null,
  };
}

/**
 * Boolean-only verifier for /support. The server intentionally hides
 * signature internals from the user, so we don't expose them here either.
 */
export async function verifyPdfPayload(cv: CVData, signatureB64?: string): Promise<{ valid: boolean }> {
  const res = await fetch(`${API_URL}/verify-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cv, signature: signatureB64 ? { signatureB64 } : null }),
  });
  if (!res.ok) return { valid: false };
  return res.json();
}

export interface ComplaintInput {
  email:   string;
  subject: string;
  message: string;
  author:  string;
}

export async function submitComplaint(input: ComplaintInput): Promise<{ ok: true; id: string }> {
  const res = await fetch(`${API_URL}/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Falha a submeter');
  }
  return res.json();
}
