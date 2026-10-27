import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { renderPdf } from '../pdf/render';
import { readPayloadFromPdf } from '../pdf/read';
import { normalizeCV, templateIds } from '../../shared/normalizeCV';
import { sampleCVByLocale } from '../../client/src/utils/sampleCvByLocale';
import { encryptPayload } from '../crypto.js';
const meta = { createdAt: '2026-01-01T00:00:00.000Z', lastEditAt: '2026-01-01T00:00:00.000Z', editCount: 1, lastSentEmail: null };

describe('free PDF pipeline', () => {
  it.each(templateIds)('renders and reopens %s with every CV section intact', async template => {
    const cv = normalizeCV({ ...sampleCVByLocale('pt'), template })!;
    const bytes = await renderPdf(cv, { meta });
    expect(bytes.subarray(0,4).toString()).toBe('%PDF');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(0);
    expect(doc.getCreator()).toBe('OpenCV');
    const payload = await readPayloadFromPdf(bytes);
    expect(payload?.app).toBe('OpenCV');
    expect(payload?.cv).toEqual(cv);
    // Reimporting does not lock identity or require a previous purchase.
    const updated = { ...payload!.cv, personal: { ...cv.personal, fullName: 'João Silva' } };
    const edited = await renderPdf(updated, { meta });
    expect((await readPayloadFromPdf(edited))?.cv.personal.fullName).toBe('João Silva');
  }, 20000);
  it('paginates long content in every new layout', async () => {
    for (const template of ['studio', 'compact', 'technical', 'academic'] as const) {
      const cv = sampleCVByLocale('en'); cv.template = template;
      cv.experience = Array.from({ length: 15 }, (_, i) => ({ ...cv.experience[0], id: `exp-${i}` }));
      const bytes = await renderPdf(cv, { meta });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
      expect((await readPayloadFromPdf(bytes))?.cv.experience).toHaveLength(15);
    }
  }, 30000);
  it('includes every page of a certificate in framed and original modes', async () => {
    const cert = await PDFDocument.create(); cert.addPage(); cert.addPage();
    const raw = await cert.save();
    const cv = sampleCVByLocale('pt');
    const base = await PDFDocument.load(await renderPdf(cv, { meta }));
    for (const framed of [true, false]) {
      cv.certificates = [{ id:'certificate', name:'Formação Avançada', description:'Certificado de teste', pdfDataUrl:`data:application/pdf;base64,${Buffer.from(raw).toString('base64')}`, bytes:raw.length, pageCount:2, hash:'test', framed }];
      const output = await PDFDocument.load(await renderPdf(cv, { meta }));
      expect(output.getPageCount()).toBe(base.getPageCount() + 2);
    }
  });
  it('fails an invalid attachment instead of silently dropping it', async () => {
    const cv = sampleCVByLocale('pt');
    cv.certificates = [{ id:'broken', name:'Broken', description:'', pdfDataUrl:'data:application/pdf;base64,YWJj', bytes:3, pageCount:1, hash:'' }];
    await expect(renderPdf(cv, { meta })).rejects.toThrow('Invalid certificate');
  });
  it('still reads legacy cveaver.dat payloads with the same installation key', async () => {
    const doc = await PDFDocument.create(); doc.addPage();
    const cv = sampleCVByLocale('pt');
    await doc.attach(encryptPayload({ v:2, app:'CVeaver', cv, meta }), 'cveaver.dat');
    expect((await readPayloadFromPdf(Buffer.from(await doc.save())))?.cv).toEqual(cv);
  });
});
