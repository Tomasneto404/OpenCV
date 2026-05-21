/**
 * Read, validate and prepare a PDF certificate before adding it to the CV.
 *
 * The flow:
 *   1. Validate type (must be application/pdf) + size (<= 5 MB).
 *   2. Open with pdf-lib to ensure it's a real PDF and read pageCount.
 *      Encrypted/password-protected PDFs throw — we surface a friendly error.
 *   3. Compute sha256 over the bytes (so duplicates are detectable).
 *   4. Convert to base64 data URL for storage in the CV JSON.
 *
 * Caller is responsible for the total-size cap (15 MB across all certs).
 */
import { newId, type CertificateItem } from '../types';

export const CERT_MAX_BYTES = 5 * 1024 * 1024;          // 5 MB per file
export const CERT_TOTAL_CAP = 15 * 1024 * 1024;         // 15 MB combined
export const CERT_MAX_COUNT = 5;

export type CertErrorCode = 'too-large' | 'not-pdf' | 'encrypted' | 'bad-pdf';

export class CertError extends Error {
  code: CertErrorCode;
  constructor(code: CertErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Parse a user-picked file into a CertificateItem ready to push into cv.certificates. */
export async function processCertificate(file: File, name: string, description = ''): Promise<CertificateItem> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new CertError('not-pdf', 'O ficheiro tem de ser PDF.');
  }
  if (file.size > CERT_MAX_BYTES) {
    throw new CertError('too-large', 'Ficheiro maior que 5 MB.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Open via pdf-lib (lazy) to get page count + detect encryption
  const { PDFDocument } = await import('pdf-lib');
  let pageCount = 0;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
    pageCount = doc.getPageCount();
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (/encrypt|password/i.test(msg)) {
      throw new CertError('encrypted', 'PDF cifrado / com password não é suportado.');
    }
    throw new CertError('bad-pdf', 'Ficheiro PDF inválido.');
  }

  const hash = await sha256Hex(bytes);
  const dataUrl = await bytesToDataUrl(bytes);

  return {
    id: newId(),
    name: name.trim() || file.name.replace(/\.pdf$/i, ''),
    description: description.trim(),
    pdfDataUrl: dataUrl,
    bytes: bytes.byteLength,
    pageCount,
    hash,
  };
}

/** Sum of bytes across an array of certs. */
export function totalCertBytes(items: CertificateItem[] | undefined): number {
  return (items ?? []).reduce((acc, c) => acc + c.bytes, 0);
}

export function formatBytes(n: number): string {
  if (n < 1024)          return `${n} B`;
  if (n < 1024 * 1024)   return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  /**
   * Copy into a fresh ArrayBuffer so subtle.digest gets the narrower type it
   * expects (TS rejects ArrayBufferLike, which Uint8Array carries by default).
   */
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToDataUrl(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const buf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buf).set(bytes);
    const blob = new Blob([buf], { type: 'application/pdf' });
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result));
    reader.onerror = () => reject(new CertError('bad-pdf', 'Não consegui ler o ficheiro.'));
    reader.readAsDataURL(blob);
  });
}

/** Strip the data: prefix and decode base64 into a Uint8Array for pdf-lib. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
