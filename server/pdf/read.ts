/**
 * Server-side reader for the encrypted payload embedded in a CVeaver PDF.
 *
 * Used by the /decode-pdf endpoint when the user uploads an old PDF to
 * update — the client no longer has the AES key, so the work happens here.
 *
 * Returns null when:
 *   - The PDF has no cveaver.dat attachment (not produced by us)
 *   - The attachment exists but decryption / auth-tag verification fails
 *     (tampered, or produced with a different key)
 */
import { PDFDocument, PDFDict, PDFName, PDFRawStream, decodePDFRawStream, PDFArray, PDFHexString, PDFString } from 'pdf-lib';
import { decryptPayload } from '../crypto.js';
import type { EmbedPayloadV2 } from '../types.js';

const ATTACHMENT_NAME = 'cveaver.dat';

export async function readPayloadFromPdf(input: Buffer): Promise<EmbedPayloadV2 | null> {
  const doc = await PDFDocument.load(input, { updateMetadata: false });

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

    if (![ATTACHMENT_NAME, 'opencv.dat'].includes(nameStr)) continue;

    const fileSpec = namesArr.lookup(i + 1, PDFDict);
    const ef = fileSpec.lookup(PDFName.of('EF'), PDFDict);
    const streamRef = ef.get(PDFName.of('F'));
    const stream = streamRef instanceof PDFRawStream
      ? streamRef
      : streamRef
        ? ef.context.lookup(streamRef)
        : undefined;
    if (!(stream instanceof PDFRawStream)) return null;
    const cipherBytes = Buffer.from(decodePDFRawStream(stream).decode());
    try {
      return decryptPayload(cipherBytes) as EmbedPayloadV2;
    } catch {
      return null;
    }
  }
  return null;
}
