/**
 * Server-side PDF rendering pipeline.
 *
 * Pipeline:
 *   1. renderToBuffer(<PdfDocument cv={cv} />) via @react-pdf/renderer
 *   2. Load that PDF into pdf-lib
 *   3. Append each certificate either as 1:1 copies (framed === false) or
 *      inside a template-coherent frame (framed === true / undefined).
 *   4. Encrypt the canonical payload (cv + meta + internal signature) and
 *      attach as cveaver.dat — opaque to anyone who opens the PDF.
 *   5. Set producer/author/title/keywords metadata
 *   6. Return the final bytes as a Buffer
 *
 * Frame variants per template (drawFramedCert):
 *   - modern   → accent sidebar (175pt) + sans header inside it
 *   - classic  → centred serif header, double-rule, content centred
 *   - minimal  → left-aligned serif title, hairline accent, generous space
 *   - creative → bold accent header block, content below
 *   - executive→ double-rule top/bottom in accent, serif
 */
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument, StandardFonts, rgb, type RGB, type PDFEmbeddedPage, type PDFFont, type PDFPage } from 'pdf-lib';
import { PdfDocument } from './document.js';
import { encryptPayload } from '../crypto.js';
import type { CVData, CertificateItem, SignatureEnvelope, PublicKeyInfo, CVMeta, EmbedPayloadV2, TemplateId } from '../types.js';

const APP_VERSION = '0.6.0';
const ATTACHMENT_NAME = 'cveaver.dat';

/* A4 dimensions in PDF points (1/72 in). */
const A4 = { width: 595.28, height: 841.89 } as const;

export interface RenderOptions {
  signature?: SignatureEnvelope;
  publicKey?: PublicKeyInfo;
  meta: CVMeta;
}

export async function renderPdf(cv: CVData, opts: RenderOptions): Promise<Buffer> {
  const baseBuffer = await renderToBuffer(createElement(PdfDocument, { cv }));
  const doc = await PDFDocument.load(baseBuffer);

  if (cv.certificates && cv.certificates.length > 0) {
    const accent = hexToRgb(cv.accentColor) ?? rgb(0.6, 0.42, 0.12);
    const fonts: FrameFonts = {
      sans:        await doc.embedFont(StandardFonts.Helvetica),
      sansBold:    await doc.embedFont(StandardFonts.HelveticaBold),
      sansItalic:  await doc.embedFont(StandardFonts.HelveticaOblique),
      serif:       await doc.embedFont(StandardFonts.TimesRoman),
      serifBold:   await doc.embedFont(StandardFonts.TimesRomanBold),
      serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    };

    let i = 0;
    for (const cert of cv.certificates) {
      i++;
      try {
        const certBytes = dataUrlToBytes(cert.pdfDataUrl);
        if (cert.framed === false) {
          const src = await PDFDocument.load(certBytes, { ignoreEncryption: false });
          const copied = await doc.copyPages(src, src.getPageIndices());
          copied.forEach((p) => doc.addPage(p));
        } else {
          await drawFramedCert(doc, certBytes, cert, i, cv.template, accent, fonts);
        }
      } catch (err) {
        console.warn(`[pdf] skipping cert "${cert.name}": ${(err as Error).message}`);
      }
    }
  }

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

  doc.setTitle(`CV — ${cv.personal.fullName || 'Sem nome'}`);
  if (cv.personal.fullName) doc.setAuthor(cv.personal.fullName);
  doc.setCreator('CVeaver');
  doc.setProducer(`CVeaver ${APP_VERSION}`);
  doc.setSubject(cv.personal.headline || 'Curriculum Vitae');
  doc.setKeywords(['CVeaver', 'CV', 'Resume', cv.template]);

  const out = await doc.save({ useObjectStreams: true });
  return Buffer.from(out);
}

/* ── Frame renderer (template-aware) ─────────────────────────────────── */

interface FrameFonts {
  sans: PDFFont;
  sansBold: PDFFont;
  sansItalic: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  serifItalic: PDFFont;
}

interface ContentArea { left: number; right: number; top: number; bottom: number; }

async function drawFramedCert(
  doc: PDFDocument,
  certBytes: Uint8Array,
  cert: CertificateItem,
  index: number,
  template: TemplateId,
  accent: RGB,
  fonts: FrameFonts,
): Promise<void> {
  const src = await PDFDocument.load(certBytes, { ignoreEncryption: false });
  const embedded = await doc.embedPdf(src, src.getPageIndices());
  const total = embedded.length;

  embedded.forEach((emb, pi) => {
    const page = doc.addPage([A4.width, A4.height]);
    const area = drawTemplateChrome(page, cert, index, pi + 1, total, template, accent, fonts);
    drawCertImage(page, emb, area);
  });
}

/** Draws header + footer + decorations for the chosen template and
 *  returns the content area where the embedded cert page is placed. */
function drawTemplateChrome(
  page: PDFPage,
  cert: CertificateItem,
  index: number,
  current: number,
  total: number,
  template: TemplateId,
  accent: RGB,
  fonts: FrameFonts,
): ContentArea {
  switch (template) {
    case 'classic':   return drawClassicChrome  (page, cert, current, total, accent, fonts);
    case 'minimal':   return drawMinimalChrome  (page, cert, current, total, accent, fonts);
    case 'creative':  return drawCreativeChrome (page, cert, current, total, accent, fonts);
    case 'executive': return drawExecutiveChrome(page, cert, current, total, accent, fonts);
    case 'modern':
    case 'compact':
    default:          return drawModernChrome   (page, cert, current, total, index, accent, fonts);
  }
}

/* ── Modern: sidebar accent block on the left ────────────────────────── */
function drawModernChrome(page: PDFPage, cert: CertificateItem, current: number, total: number, index: number, accent: RGB, fonts: FrameFonts): ContentArea {
  const { width, height } = page.getSize();
  const SIDEBAR = 175;

  // Sidebar block
  page.drawRectangle({ x: 0, y: 0, width: SIDEBAR, height, color: accent });

  const left = 18;
  const textX = left;
  const top = height - 50;

  page.drawText('CERTIFICADO', {
    x: textX, y: top, size: 7.5, font: fonts.sansBold, color: rgb(1, 1, 1),
  });
  page.drawText(`#${index}`, {
    x: SIDEBAR - 28, y: top, size: 7.5, font: fonts.sansBold, color: rgb(1, 1, 1), opacity: 0.7,
  });

  drawWrappedText(page, cert.name || 'Certificado', {
    x: textX, y: top - 22, maxWidth: SIDEBAR - left - 14,
    font: fonts.sansBold, size: 14, color: rgb(1, 1, 1), lineHeight: 1.2,
  });

  if (cert.description) {
    drawWrappedText(page, cert.description, {
      x: textX, y: top - 70, maxWidth: SIDEBAR - left - 14,
      font: fonts.sansItalic, size: 9.5, color: rgb(1, 1, 1, 0.85), lineHeight: 1.4,
    });
  }

  // Sidebar footer
  page.drawText('CVeaver', {
    x: textX, y: 38, size: 9, font: fonts.sansBold, color: rgb(1, 1, 1, 0.85),
  });
  const pageLabel = total > 1 ? `${current} / ${total}` : `${cert.pageCount} ${cert.pageCount === 1 ? 'pág.' : 'págs.'}`;
  page.drawText(pageLabel, {
    x: textX, y: 24, size: 8.5, font: fonts.sans, color: rgb(1, 1, 1, 0.7),
  });

  return { left: SIDEBAR + 24, right: width - 24, top: height - 24, bottom: 24 };
}

/* ── Classic: centred serif + double rule ────────────────────────────── */
function drawClassicChrome(page: PDFPage, cert: CertificateItem, current: number, total: number, accent: RGB, fonts: FrameFonts): ContentArea {
  const { width, height } = page.getSize();
  const margin = 64;

  drawCenteredText(page, 'CERTIFICADO', { y: height - 56, font: fonts.serifBold, size: 8.5, color: accent, letterSpacing: 3.2, pageWidth: width });
  drawCenteredText(page, cert.name || 'Certificado', { y: height - 84, font: fonts.serifBold, size: 22, color: rgb(0.10, 0.07, 0.03), pageWidth: width });
  if (cert.description) {
    drawCenteredText(page, cert.description, { y: height - 105, font: fonts.serifItalic, size: 10.5, color: rgb(0.35, 0.29, 0.21), pageWidth: width });
  }
  // Double rule
  page.drawLine({ start: { x: margin, y: height - 128 }, end: { x: width - margin, y: height - 128 }, thickness: 1.4, color: accent });
  page.drawLine({ start: { x: margin, y: height - 132 }, end: { x: width - margin, y: height - 132 }, thickness: 0.5, color: accent, opacity: 0.65 });

  // Footer
  drawCenteredText(page, `cveaver.app · ${current} de ${total}`, { y: 30, font: fonts.serif, size: 9, color: rgb(0.5, 0.41, 0.27), pageWidth: width });

  return { left: margin, right: width - margin, top: height - 148, bottom: 56 };
}

/* ── Minimal: left-aligned serif + hairline accent ───────────────────── */
function drawMinimalChrome(page: PDFPage, cert: CertificateItem, current: number, total: number, accent: RGB, fonts: FrameFonts): ContentArea {
  const { width, height } = page.getSize();
  const margin = 56;

  page.drawText('ANEXO · CERTIFICADO', {
    x: margin, y: height - 56, size: 8, font: fonts.sansBold, color: rgb(0.36, 0.30, 0.22), opacity: 0.85,
  });
  drawWrappedText(page, cert.name || 'Certificado', {
    x: margin, y: height - 78, maxWidth: width - margin * 2,
    font: fonts.serifBold, size: 18, color: rgb(0.10, 0.07, 0.03), lineHeight: 1.2,
  });
  if (cert.description) {
    drawWrappedText(page, cert.description, {
      x: margin, y: height - 102, maxWidth: width - margin * 2,
      font: fonts.serif, size: 10, color: rgb(0.45, 0.38, 0.28), lineHeight: 1.4,
    });
  }
  // Hairline accent
  page.drawLine({ start: { x: margin, y: height - 118 }, end: { x: margin + 36, y: height - 118 }, thickness: 1.4, color: accent });

  // Footer
  page.drawText('cveaver.app', { x: margin, y: 28, size: 8.5, font: fonts.sans, color: rgb(0.5, 0.41, 0.27) });
  const right = `${current} / ${total}`;
  const tw = fonts.sans.widthOfTextAtSize(right, 8.5);
  page.drawText(right, { x: width - margin - tw, y: 28, size: 8.5, font: fonts.sans, color: rgb(0.5, 0.41, 0.27) });

  return { left: margin, right: width - margin, top: height - 134, bottom: 48 };
}

/* ── Creative: full-width accent header block ───────────────────────── */
function drawCreativeChrome(page: PDFPage, cert: CertificateItem, current: number, total: number, accent: RGB, fonts: FrameFonts): ContentArea {
  const { width, height } = page.getSize();
  const HEADER_H = 110;
  const margin = 48;
  const FOOTER_H = 32;

  page.drawRectangle({ x: 0, y: height - HEADER_H, width, height: HEADER_H, color: accent });
  page.drawText('CERTIFICADO', {
    x: margin, y: height - 44, size: 8.5, font: fonts.sansBold, color: rgb(1, 1, 1, 0.88),
  });
  drawWrappedText(page, cert.name || 'Certificado', {
    x: margin, y: height - 68, maxWidth: width - margin * 2,
    font: fonts.sansBold, size: 22, color: rgb(1, 1, 1), lineHeight: 1.1,
  });
  if (cert.description) {
    drawWrappedText(page, cert.description, {
      x: margin, y: height - 92, maxWidth: width - margin * 2,
      font: fonts.sans, size: 10.5, color: rgb(1, 1, 1, 0.92), lineHeight: 1.4,
    });
  }

  // Footer accent strip
  page.drawRectangle({ x: 0, y: 0, width, height: FOOTER_H, color: accent });
  page.drawText('cveaver.app', { x: margin, y: 12, size: 9, font: fonts.sansBold, color: rgb(1, 1, 1, 0.88) });
  const right = `${current} / ${total}`;
  const tw = fonts.sansBold.widthOfTextAtSize(right, 9);
  page.drawText(right, { x: width - margin - tw, y: 12, size: 9, font: fonts.sansBold, color: rgb(1, 1, 1, 0.88) });

  return { left: margin, right: width - margin, top: height - HEADER_H - 16, bottom: FOOTER_H + 16 };
}

/* ── Executive: double rule top + bottom in accent ──────────────────── */
function drawExecutiveChrome(page: PDFPage, cert: CertificateItem, current: number, total: number, accent: RGB, fonts: FrameFonts): ContentArea {
  const { width, height } = page.getSize();
  const margin = 64;

  // Top double rule
  page.drawLine({ start: { x: margin, y: height - 50 }, end: { x: width - margin, y: height - 50 }, thickness: 1.6, color: accent });
  page.drawLine({ start: { x: margin, y: height - 54 }, end: { x: width - margin, y: height - 54 }, thickness: 0.5, color: accent, opacity: 0.65 });

  drawCenteredText(page, 'CERTIFICADO', { y: height - 76, font: fonts.serifBold, size: 9, color: accent, letterSpacing: 4, pageWidth: width });
  drawCenteredText(page, cert.name || 'Certificado', { y: height - 104, font: fonts.serifBold, size: 24, color: rgb(0.10, 0.07, 0.03), pageWidth: width });
  if (cert.description) {
    drawCenteredText(page, cert.description, { y: height - 124, font: fonts.serifItalic, size: 11, color: rgb(0.35, 0.29, 0.21), pageWidth: width });
  }

  // Bottom double rule
  page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 0.5, color: accent, opacity: 0.65 });
  page.drawLine({ start: { x: margin, y: 56 }, end: { x: width - margin, y: 56 }, thickness: 1.6, color: accent });
  drawCenteredText(page, `cveaver.app · ${current} de ${total}`, { y: 36, font: fonts.serif, size: 9, color: rgb(0.5, 0.41, 0.27), pageWidth: width });

  return { left: margin, right: width - margin, top: height - 152, bottom: 80 };
}

/* ── Cert image drawing ──────────────────────────────────────────────── */
function drawCertImage(page: PDFPage, embedded: PDFEmbeddedPage, area: ContentArea) {
  const availW = area.right - area.left;
  const availH = area.top - area.bottom;
  const srcW = embedded.width;
  const srcH = embedded.height;
  const scale = Math.min(availW / srcW, availH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const drawX = area.left + (availW - drawW) / 2;
  const drawY = area.bottom + (availH - drawH) / 2;

  page.drawRectangle({
    x: drawX - 1, y: drawY - 1, width: drawW + 2, height: drawH + 2,
    borderColor: rgb(0.85, 0.82, 0.74), borderWidth: 0.6,
  });
  page.drawPage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH });
}

/* ── Text helpers ────────────────────────────────────────────────────── */

interface TextOpts {
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color: RGB;
  lineHeight?: number;
  maxLines?: number;
}

function drawWrappedText(page: PDFPage, text: string, opts: TextOpts): number {
  const lh = opts.lineHeight ?? 1.3;
  const maxLines = opts.maxLines ?? 2;
  const lines = wrapLines(text, opts.maxWidth, opts.font, opts.size, maxLines);
  lines.forEach((line, i) => {
    page.drawText(line, {
      x: opts.x,
      y: opts.y - i * opts.size * lh,
      size: opts.size,
      font: opts.font,
      color: opts.color,
    });
  });
  return opts.y - (lines.length - 1) * opts.size * lh;
}

function wrapLines(text: string, maxWidth: number, font: PDFFont, size: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const probe = current ? current + ' ' + w : w;
    if (font.widthOfTextAtSize(probe, size) <= maxWidth) {
      current = probe;
    } else {
      if (current) lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  // Ellipsise the last line if anything remains
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    const rest = words.slice(words.indexOf(last.split(' ').slice(-1)[0]) + 1);
    if (rest.length > 0) {
      while (font.widthOfTextAtSize(last + '…', size) > maxWidth && last.length > 0) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + '…';
    }
  }
  return lines.length ? lines : [''];
}

interface CenterOpts {
  y: number;
  font: PDFFont;
  size: number;
  color: RGB;
  pageWidth: number;
  letterSpacing?: number;
}

function drawCenteredText(page: PDFPage, text: string, opts: CenterOpts) {
  const tracked = opts.letterSpacing
    ? text.split('').join(String.fromCharCode(8202).repeat(0)) // no-op; we'll add spacing via x adjustments
    : text;
  if (!opts.letterSpacing) {
    const tw = opts.font.widthOfTextAtSize(tracked, opts.size);
    page.drawText(tracked, { x: (opts.pageWidth - tw) / 2, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    return;
  }
  // Render with custom inter-character spacing
  const chars = text.split('');
  const totalWidth = chars.reduce((acc, ch) => acc + opts.font.widthOfTextAtSize(ch, opts.size), 0) + (chars.length - 1) * opts.letterSpacing;
  let x = (opts.pageWidth - totalWidth) / 2;
  for (const ch of chars) {
    page.drawText(ch, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    x += opts.font.widthOfTextAtSize(ch, opts.size) + opts.letterSpacing;
  }
}

/* ── Misc helpers ────────────────────────────────────────────────────── */

function hexToRgb(hex?: string): RGB | null {
  if (!hex) return null;
  const h = hex.replace('#', '').trim();
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}
