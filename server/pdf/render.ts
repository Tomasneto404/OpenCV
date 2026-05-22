/**
 * Server-side PDF rendering pipeline.
 *
 * Why server-side: the client bundle no longer ships @react-pdf/renderer
 * or the template components. That removes the easiest paywall bypass
 * (calling generateCvPdf in DevTools). The renderer only runs here, behind
 * the /pdf/:sessionId endpoint which itself checks Stripe payment status.
 *
 * Pipeline:
 *   1. renderToBuffer(<PdfDocument cv={cv} />) via @react-pdf/renderer
 *   2. Load that PDF into pdf-lib
 *   3. Append every certificate's pages at the end
 *   4. Encrypt the canonical payload (cv + meta + internal signature) with
 *      AES-256-GCM and attach as cveaver.dat — opaque to anyone who opens
 *      the PDF in a viewer.
 *   5. Set producer/author/title/keywords metadata (no signature reference
 *      in user-visible fields)
 *   6. Return the final bytes as a Buffer
 */
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { PdfDocument } from './document.js';
import { encryptPayload } from '../crypto.js';
import type { CVData, SignatureEnvelope, PublicKeyInfo, CVMeta, EmbedPayloadV2 } from '../types.js';

const APP_VERSION = '0.4.0';
const ATTACHMENT_NAME = 'cveaver.dat';

export interface RenderOptions {
  signature?: SignatureEnvelope;
  publicKey?: PublicKeyInfo;
  meta: CVMeta;
}

/** Render the CV to a finished, attached, metadata-stamped PDF buffer. */
export async function renderPdf(cv: CVData, opts: RenderOptions): Promise<Buffer> {
  // 1. Render the react-pdf document to a base buffer.
  const baseBuffer = await renderToBuffer(createElement(PdfDocument, { cv }));

  // 2. Open in pdf-lib so we can append cert pages + the encrypted attachment.
  const doc = await PDFDocument.load(baseBuffer);

  // 3. Certificate pages — best-effort. A broken/encrypted cert is skipped
  //    with a server log rather than failing the whole request.
  for (const cert of cv.certificates ?? []) {
    try {
      const certBytes = dataUrlToBytes(cert.pdfDataUrl);
      const src = await PDFDocument.load(certBytes, { ignoreEncryption: false });
      const copied = await doc.copyPages(src, src.getPageIndices());
      copied.forEach((p) => doc.addPage(p));
    } catch (err) {
      console.warn(`[pdf] skipping cert "${cert.name}": ${(err as Error).message}`);
    }
  }

  // 4. Build, encrypt and attach the payload.
  const payload: EmbedPayloadV2 = {
    v: 2,
    app: 'CVeaver',
    appVersion: APP_VERSION,
    cv,
    meta: opts.meta,
    ...(opts.signature ? { signature: opts.signature } : {}),
    ...(opts.publicKey ? { publicKey: opts.publicKey } : {}),
  };
  const cipherBytes = encryptPayload(payload);

  await doc.attach(cipherBytes, ATTACHMENT_NAME, {
    mimeType: 'application/octet-stream',
    description: 'Internal data',
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // 5. Metadata — keep it generic. No "signed" / "ed25519" wording in
  //    fields the user might inspect (Acrobat → Properties).
  doc.setTitle(`CV — ${cv.personal.fullName || 'Sem nome'}`);
  if (cv.personal.fullName) doc.setAuthor(cv.personal.fullName);
  doc.setCreator('CVeaver');
  doc.setProducer(`CVeaver ${APP_VERSION}`);
  doc.setSubject(cv.personal.headline || 'Curriculum Vitae');
  doc.setKeywords(['CVeaver', 'CV', 'Resume', cv.template]);

  const out = await doc.save({ useObjectStreams: true });
  return Buffer.from(out);
}

/** Strip the data: prefix and decode base64 into a Uint8Array. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}
