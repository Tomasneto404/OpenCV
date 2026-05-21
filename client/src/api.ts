import type { CVData } from './types';
import type { SignatureEnvelope, PublicKeyInfo } from './utils/pdfEnhance';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export async function saveCV(cv: CVData): Promise<string> {
  const res = await fetch(`${API_URL}/cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cv }),
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

export async function createCheckout(cvId: string, mode: 'new' | 'update'): Promise<string> {
  const res = await fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cvId, mode }),
  });
  if (!res.ok) throw new Error('Falha a criar sessão de pagamento');
  const json = await res.json();
  return json.url as string;
}

export interface VerifyResult {
  paid: boolean;
  signature?: SignatureEnvelope;
  publicKey?: PublicKeyInfo;
}

export async function verifySession(sessionId: string, cvId?: string): Promise<VerifyResult> {
  const url = new URL(`${API_URL}/verify-session/${sessionId}`);
  if (cvId) url.searchParams.set('cv_id', cvId);
  const res = await fetch(url);
  if (!res.ok) return { paid: false };
  const json = await res.json();
  return {
    paid: Boolean(json.paid),
    signature: json.signature,
    publicKey: json.publicKey,
  };
}

export interface PdfVerifyResult {
  valid: boolean;
  reason?: 'unsigned' | 'signature-mismatch' | string | null;
  keyId?: string | null;
  signedAt?: string | null;
  hash?: string | null;
  algorithm?: string | null;
}

export async function verifyPdfPayload(cv: CVData, signature?: SignatureEnvelope): Promise<PdfVerifyResult> {
  const res = await fetch(`${API_URL}/verify-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cv, signature: signature ?? null }),
  });
  if (!res.ok) return { valid: false, reason: 'server-error' };
  return res.json();
}

export interface ComplaintInput {
  email:    string;
  subject:  string;
  message:  string;
  keyId:    string | null;
  hash:     string | null;
  signedAt: string | null;
  author:   string;
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
