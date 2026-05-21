/**
 * Post-processing pipeline for the generated CV PDF.
 *
 * Two responsibilities:
 *
 *   enhancePdf()
 *     1. Take the react-pdf blob.
 *     2. Append every certificate's pages at the end of the document.
 *     3. Attach the canonical cveaver.json (config + optional signature) as a
 *        real PDF file attachment, so the update flow can read it back.
 *     4. Set CVeaver-specific metadata (Title, Author, Producer, Keywords,
 *        creation/modification dates aligned with the signature).
 *
 *   readEmbeddedPayload()
 *     Walks the PDF Catalog → Names → EmbeddedFiles → "cveaver.json" and
 *     returns the decoded payload. Returns null if the PDF wasn't produced
 *     by CVeaver (no such attachment).
 *
 * Everything is async + lazy-loaded — pdf-lib stays out of the main bundle.
 */
import type { CVData } from '../types';
import { dataUrlToBytes } from './certificate';

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

export interface EmbedPayload {
  /** App version that wrote the PDF — bumped on schema changes. */
  app: 'CVeaver';
  appVersion: string;
  cv: CVData;
  signature?: SignatureEnvelope;
  publicKey?: PublicKeyInfo;
}

const APP_VERSION = '0.3.0';
const ATTACHMENT_NAME = 'cveaver.json';

/**
 * Post-process a react-pdf blob: attach the CV config as a real PDF file attachment
 * and write CVeaver-specific metadata. The attachment is what the update / verify
 * flows read back.
 */
export async function enhancePdf(input: Blob, cv: CVData, signature?: SignatureEnvelope, publicKey?: PublicKeyInfo): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');

  const bytes = new Uint8Array(await input.arrayBuffer());
  const doc = await PDFDocument.load(bytes);

  // Append every certificate's pages at the end of the CV.
  // We do this BEFORE writing the attachment so the embedded cveaver.json
  // reflects the same content the reader sees.
  for (const cert of cv.certificates ?? []) {
    try {
      const certBytes = dataUrlToBytes(cert.pdfDataUrl);
      const src = await PDFDocument.load(certBytes, { ignoreEncryption: false });
      const copied = await doc.copyPages(src, src.getPageIndices());
      copied.forEach((p) => doc.addPage(p));
    } catch (err) {
      console.warn(`[CVeaver] Skipping cert "${cert.name}": ${(err as Error).message}`);
    }
  }

  const payload: EmbedPayload = {
    app: 'CVeaver',
    appVersion: APP_VERSION,
    cv,
    ...(signature ? { signature } : {}),
    ...(publicKey ? { publicKey } : {}),
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  await doc.attach(payloadBytes, ATTACHMENT_NAME, {
    mimeType: 'application/json',
    description: signature
      ? `CVeaver signed config (key ${signature.keyId})`
      : 'CVeaver config (unsigned dev preview)',
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  doc.setTitle(`CV — ${cv.personal.fullName || 'Sem nome'}`);
  if (cv.personal.fullName) doc.setAuthor(cv.personal.fullName);
  doc.setCreator('CVeaver');
  doc.setProducer(`CVeaver ${APP_VERSION}${signature ? ` · signed:${signature.keyId}` : ' · unsigned'}`);
  doc.setSubject(cv.personal.headline || 'Curriculum Vitae');
  doc.setKeywords([
    'CVeaver',
    'CV',
    'Resume',
    cv.template,
    signature ? `signature:${signature.keyId}` : 'unsigned',
  ]);
  if (signature) {
    doc.setCreationDate(new Date(signature.signedAt));
    doc.setModificationDate(new Date(signature.signedAt));
  }

  const out = await doc.save({ useObjectStreams: true });
  const copy = new Uint8Array(out.byteLength);
  copy.set(out);
  return new Blob([copy.buffer], { type: 'application/pdf' });
}

/**
 * Read the CVeaver payload out of a PDF, if present.
 * Returns null when the PDF wasn't produced by CVeaver.
 */
export async function readEmbeddedPayload(input: Blob): Promise<EmbedPayload | null> {
  const { PDFDocument, PDFDict, PDFName, PDFRawStream, decodePDFRawStream, PDFArray, PDFHexString, PDFString } = await import('pdf-lib');

  const bytes = new Uint8Array(await input.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });

  const namesDict = doc.catalog.lookup(PDFName.of('Names'), PDFDict);
  if (!namesDict) return null;
  const embeddedFiles = namesDict.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
  if (!embeddedFiles) return null;
  const namesArr = embeddedFiles.lookup(PDFName.of('Names'), PDFArray);
  if (!namesArr) return null;

  for (let i = 0; i < namesArr.size(); i += 2) {
    const nameObj = namesArr.get(i);
    const nameStr =
      nameObj instanceof PDFHexString ? nameObj.decodeText() :
      nameObj instanceof PDFString    ? nameObj.decodeText() :
      String(nameObj);

    if (nameStr !== ATTACHMENT_NAME) continue;

    const fileSpec = namesArr.lookup(i + 1, PDFDict);
    const ef = fileSpec.lookup(PDFName.of('EF'), PDFDict);
    const streamRef = ef.get(PDFName.of('F'));
    const stream = streamRef instanceof PDFRawStream
      ? streamRef
      : streamRef
        ? ef.context.lookup(streamRef)
        : undefined;
    if (!(stream instanceof PDFRawStream)) return null;
    const decoded = decodePDFRawStream(stream).decode();
    const json = new TextDecoder().decode(decoded);
    try { return JSON.parse(json) as EmbedPayload; } catch { return null; }
  }

  return null;
}
