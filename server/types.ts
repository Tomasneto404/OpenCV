import type { CVData } from '../shared/cv';
export type * from '../shared/cv';
export type Locale = NonNullable<CVData['locale']>;

export interface SignatureEnvelope {
  version: number;
  algorithm: string;
  keyId: string;
  signedAt: string;
  hash: string;
  signatureB64: string;
}

export interface PublicKeyInfo {
  keyId: string;
  algorithm: string;
  publicKeyPem: string;
  publicKeyDerB64: string;
}

/**
 * Per-CV metadata kept inside the encrypted PDF payload. Updated by the
 * server on each successful render — never written by the client.
 */
export interface CVMeta {
  /** ISO timestamp of the first time this CV was rendered. */
  createdAt: string;
  /** ISO timestamp of the most recent render. */
  lastEditAt: string;
  /** Legacy export counter. Starts at 1. */
  editCount: number;
  /** Legacy metadata field, always null for new exports. */
  lastSentEmail: string | null;
}

/**
 * The full payload embedded in the PDF (encrypted with the server AES key
 * before being attached). v2 is the encrypted-with-meta format.
 */
export interface EmbedPayloadV2 {
  v: 2;
  app: 'OpenCV' | 'CVeaver';
  appVersion: string;
  cv: CVData;
  meta: CVMeta;
  /** Internal — used by /support, never exposed to the user. */
  signature?: SignatureEnvelope;
  /** Internal — for offline verifiers, never exposed to the user. */
  publicKey?: PublicKeyInfo;
}
