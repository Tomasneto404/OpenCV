/**
 * Lazy-built sample assets — used to enrich the sampleCV with a real
 * profile photo (the CVeaver logo) and a fictional PDF certificate that
 * the user can see in the live preview before paying.
 *
 * Why dynamic: the certificate is generated on the fly with pdf-lib so we
 * don't ship a multi-KB base64 blob in the main bundle. The logo photo is
 * fetched once and converted to a data URL because the CV preview and PDF
 * pipeline both expect data: URLs (not paths).
 *
 * Results are cached for the session — subsequent calls are instant.
 */
import { newId, type CertificateItem, type CVData } from '../types';

interface SampleAssets {
  photoDataUrl: string;
  certificate: CertificateItem;
}

let cached: Promise<SampleAssets> | null = null;

/** Enrich the supplied sample CV with a profile photo + sample certificate. */
export async function buildSampleEnhanced(cv: CVData): Promise<CVData> {
  if (!cached) cached = buildAssets();
  let assets: SampleAssets;
  try {
    assets = await cached;
  } catch {
    cached = null;
    return cv;
  }
  return {
    ...cv,
    personal: { ...cv.personal, photoDataUrl: assets.photoDataUrl },
    certificates: [assets.certificate],
  };
}

async function buildAssets(): Promise<SampleAssets> {
  const [photoDataUrl, certificate] = await Promise.all([
    loadPhoto(),
    buildSampleCertificate(),
  ]);
  return { photoDataUrl, certificate };
}

async function loadPhoto(): Promise<string> {
  const res = await fetch('/logo.png');
  if (!res.ok) throw new Error(`logo fetch failed (${res.status})`);
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

/**
 * Build a fictional certificate PDF using pdf-lib — looks like a course
 * completion certificate. All text is in WinAnsi-safe Portuguese so the
 * StandardFonts (Helvetica) can render the accented characters.
 */
async function buildSampleCertificate(): Promise<CertificateItem> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontItalic  = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontSerif   = await doc.embedFont(StandardFonts.TimesRomanBold);

  const accent = rgb(0.36, 0.23, 0.07); // walnut brown
  const ink    = rgb(0.15, 0.10, 0.05);
  const muted  = rgb(0.40, 0.32, 0.22);

  const { width, height } = page.getSize();

  // Outer + inner decorative borders
  page.drawRectangle({
    x: 30, y: 30, width: width - 60, height: height - 60,
    borderColor: accent, borderWidth: 3,
  });
  page.drawRectangle({
    x: 38, y: 38, width: width - 76, height: height - 76,
    borderColor: accent, borderWidth: 0.7, opacity: 0.6,
  });

  // Corner ornaments — small filled circles
  const corners: [number, number][] = [
    [50, height - 50], [width - 50, height - 50],
    [50, 50],          [width - 50, 50],
  ];
  for (const [cx, cy] of corners) {
    page.drawCircle({ x: cx, y: cy, size: 4, color: accent });
  }

  // Top kicker
  drawCentred(page, 'CIM-PT · CENTRO DE INOVAÇÃO EM MADEIRA', {
    y: height - 110, font: fontBold, size: 8.5, color: muted, letterSpacing: 3.5, width,
  });

  // Title
  drawCentred(page, 'CERTIFICADO DE CONCLUSÃO', {
    y: height - 165, font: fontSerif, size: 32, color: accent, width,
  });

  // Decorative line
  page.drawLine({
    start: { x: width / 2 - 80, y: height - 195 },
    end:   { x: width / 2 + 80, y: height - 195 },
    thickness: 1.2, color: accent,
  });

  // Conferred to
  drawCentred(page, 'Confere-se o presente certificado a', {
    y: height - 260, font: fontRegular, size: 12, color: ink, width,
  });
  drawCentred(page, 'Zé Castor', {
    y: height - 320, font: fontSerif, size: 38, color: ink, width,
  });

  // Body
  drawCentred(page, 'por ter concluído com aproveitamento o curso de especialização', {
    y: height - 380, font: fontRegular, size: 11.5, color: ink, width,
  });
  drawCentred(page, '« Construção de Pontes em Madeira Lamelada-Colada »', {
    y: height - 415, font: fontBold, size: 14, color: accent, width,
  });

  // Details
  drawCentred(page, 'Carga horária: 120 horas      ·      Avaliação final: 19 valores', {
    y: height - 460, font: fontItalic, size: 10.5, color: muted, width,
  });

  // Signature block
  drawCentred(page, 'Paços de Ferreira, 14 de Setembro de 2021', {
    y: 280, font: fontRegular, size: 11, color: ink, width,
  });

  page.drawLine({
    start: { x: width / 2 - 110, y: 225 },
    end:   { x: width / 2 + 110, y: 225 },
    thickness: 0.8, color: muted,
  });
  drawCentred(page, 'Prof.ª Doutora Madalena Pinhal', {
    y: 208, font: fontBold, size: 10.5, color: ink, width,
  });
  drawCentred(page, 'Diretora · CIM-PT — Centro de Inovação em Madeira', {
    y: 192, font: fontItalic, size: 9, color: muted, width,
  });

  // Footer cert number
  drawCentred(page, 'Certificado n.º  2021/CIM/0314    ·    Verificável em cim-pt.org/cert', {
    y: 88, font: fontRegular, size: 8, color: muted, width,
  });

  const bytes = await doc.save();
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  const blob = new Blob([copyBytes(u8)], { type: 'application/pdf' });
  const dataUrl = await blobToDataUrl(blob);

  const digest = await crypto.subtle.digest('SHA-256', copyBytes(u8));
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    id: newId(),
    name: 'Construção de Pontes em Madeira Lamelada-Colada',
    description: 'Curso de Especialização · CIM-PT · 120 horas · 19 valores',
    pdfDataUrl: dataUrl,
    bytes: u8.byteLength,
    pageCount: 1,
    hash,
    framed: true,
  };
}

interface CentredTextOpts {
  y: number;
  font: Awaited<ReturnType<import('pdf-lib').PDFDocument['embedFont']>>;
  size: number;
  color: import('pdf-lib').RGB;
  width: number;
  letterSpacing?: number;
}

function drawCentred(
  page: import('pdf-lib').PDFPage,
  text: string,
  opts: CentredTextOpts,
) {
  if (opts.letterSpacing) {
    const chars = text.split('');
    const totalW = chars.reduce((acc, c) => acc + opts.font.widthOfTextAtSize(c, opts.size), 0)
      + (chars.length - 1) * opts.letterSpacing;
    let x = (opts.width - totalW) / 2;
    for (const ch of chars) {
      page.drawText(ch, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
      x += opts.font.widthOfTextAtSize(ch, opts.size) + opts.letterSpacing;
    }
    return;
  }
  const w = opts.font.widthOfTextAtSize(text, opts.size);
  page.drawText(text, {
    x: (opts.width - w) / 2,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color,
  });
}

function copyBytes(u8: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u8.byteLength);
  new Uint8Array(out).set(u8);
  return out;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
