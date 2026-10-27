/** Read a portable, validated OpenCV JSON attachment. No installation secrets. */
import { PDFDocument, PDFDict, PDFName, PDFRawStream, decodePDFRawStream, PDFArray, PDFHexString, PDFString } from 'pdf-lib';
import { normalizeCV } from '../../shared/normalizeCV';
import type { CVData } from '../types';

export class LegacyEncryptedPdfError extends Error {
  constructor() {
    super('Este PDF antigo usa encriptação. Importa a cópia JSON ou guarda o JSON na versão anterior do OpenCV.');
  }
}

export async function readCVFromPdf(input: Buffer): Promise<CVData | null> {
  const doc = await PDFDocument.load(input, { updateMetadata: false });
  const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  const root = names?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict);
  if (!root) return null;
  const pending = [root];
  const visited = new Set<PDFDict>();
  let legacy = false;
  // Name trees may contain nested Kids instead of a flat Names array.
  while (pending.length && visited.size < 256) {
    const tree = pending.pop()!;
    if (visited.has(tree)) continue;
    visited.add(tree);
    const kids = tree.lookupMaybe(PDFName.of('Kids'), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) pending.push(kids.lookup(i, PDFDict));
    const entries = tree.lookupMaybe(PDFName.of('Names'), PDFArray);
    if (!entries) continue;
    for (let i = 0; i + 1 < entries.size(); i += 2) {
      const name = entries.get(i);
      if (!(name instanceof PDFHexString || name instanceof PDFString)) continue;
      const filename = name.decodeText();
      if (filename === 'opencv.dat' || filename === 'cveaver.dat') legacy = true;
      if (filename !== 'opencv.json') continue;
      const spec = entries.lookup(i + 1, PDFDict);
      const ef = spec.lookupMaybe(PDFName.of('EF'), PDFDict);
      const stream = ef?.lookup(PDFName.of('F')) ?? ef?.lookup(PDFName.of('UF'));
      if (!(stream instanceof PDFRawStream)) return null;
      const data = decodePDFRawStream(stream).decode();
      if (data.length > 80 * 1024 * 1024) return null;
      try { return normalizeCV(JSON.parse(Buffer.from(data).toString('utf8'))); }
      catch { return null; }
    }
  }
  if (legacy) throw new LegacyEncryptedPdfError();
  return null;
}
