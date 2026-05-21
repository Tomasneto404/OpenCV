import type { CVData } from '../types';
import type { SignatureEnvelope, PublicKeyInfo } from './pdfEnhance';

interface Options {
  filename?: string;
  signature?: SignatureEnvelope;
  publicKey?: PublicKeyInfo;
}

/**
 * Generate a real, text-selectable PDF (via @react-pdf/renderer), then post-process
 * it with pdf-lib to attach the CVeaver config + signature. Both libs are lazy-loaded
 * so they stay out of the main bundle.
 */
export async function generateCvPdf(cv: CVData, { filename = 'cv.pdf', signature, publicKey }: Options = {}) {
  const [{ pdf }, { PdfDocument }, enhance] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../pdf/document'),
    import('./pdfEnhance'),
  ]);

  const rawBlob = await pdf(<PdfDocument cv={cv} />).toBlob();
  const finalBlob = await enhance.enhancePdf(rawBlob, cv, signature, publicKey);

  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
