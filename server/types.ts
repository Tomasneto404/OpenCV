/**
 * Server-side mirror of the subset of client types used by the PDF renderers.
 *
 * Kept in sync with client/src/types.ts — only fields the templates read are
 * declared here (no sample/empty helpers, no IDs generator).
 */

export type TemplateId = 'modern' | 'classic' | 'minimal' | 'creative' | 'executive' | 'compact';

export interface PersonalInfo {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  photoDataUrl?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  url: string;
  description: string;
  stack: string;
}

export interface SkillGroup {
  id: string;
  category: string;
  items: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}

export interface CertificateItem {
  id: string;
  name: string;
  description: string;
  pdfDataUrl: string;
  bytes: number;
  pageCount: number;
  hash: string;
  /** Default true — server embeds the certificate inside a branded
   *  template frame. When false, copyPages 1:1 (legacy behaviour). */
  framed?: boolean;
}

export interface CVData {
  version: 1;
  template: TemplateId;
  accentColor: string;
  personal: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  projects: ProjectItem[];
  certificates?: CertificateItem[];
}

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
  /** ISO timestamp of the first time this CV was rendered after payment. */
  createdAt: string;
  /** ISO timestamp of the most recent render. */
  lastEditAt: string;
  /** Number of times the user has paid to update this CV. Starts at 1. */
  editCount: number;
  /** Email address the PDF was last delivered to. Null on first render
   *  if Stripe didn't collect one or it wasn't requested. */
  lastSentEmail: string | null;
}

/**
 * The full payload embedded in the PDF (encrypted with the server AES key
 * before being attached). v2 is the encrypted-with-meta format.
 */
export interface EmbedPayloadV2 {
  v: 2;
  app: 'CVeaver';
  appVersion: string;
  cv: CVData;
  meta: CVMeta;
  /** Internal — used by /support, never exposed to the user. */
  signature?: SignatureEnvelope;
  /** Internal — for offline verifiers, never exposed to the user. */
  publicKey?: PublicKeyInfo;
}
