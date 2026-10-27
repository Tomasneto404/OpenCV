import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { renderPdf } from '../pdf/render';
import { readCVFromPdf, LegacyEncryptedPdfError } from '../pdf/read';
import { normalizeCV, templateIds } from '../../shared/normalizeCV';
import { sampleCVByLocale } from '../../client/src/utils/sampleCvByLocale';

describe('free PDF pipeline', () => {
  it.each(templateIds)('renders and reopens %s with every CV section intact', async template => {
    const cv = normalizeCV({ ...sampleCVByLocale('pt'), template })!;
    const bytes = await renderPdf(cv);
    expect(bytes.subarray(0,4).toString()).toBe('%PDF');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(0);
    expect(doc.getCreator()).toBe('OpenCV');
    const payload = await readCVFromPdf(bytes);
    expect(payload).toEqual(cv);
    // Reimporting does not lock identity or require a previous purchase.
    const updated = { ...payload!, personal: { ...cv.personal, fullName: 'João Silva' } };
    const edited = await renderPdf(updated);
    expect((await readCVFromPdf(edited))?.personal.fullName).toBe('João Silva');
  }, 20000);
  it('paginates long content in every new layout', async () => {
    for (const template of ['studio', 'compact', 'technical', 'academic'] as const) {
      const cv = sampleCVByLocale('en'); cv.template = template;
      cv.experience = Array.from({ length: 15 }, (_, i) => ({ ...cv.experience[0], id: `exp-${i}` }));
      const bytes = await renderPdf(cv);
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
      expect((await readCVFromPdf(bytes))?.experience).toHaveLength(15);
    }
  }, 30000);
  it('includes every page of a certificate in framed and original modes', async () => {
    const cert = await PDFDocument.create(); cert.addPage(); cert.addPage();
    const raw = await cert.save();
    const cv = sampleCVByLocale('pt');
    const base = await PDFDocument.load(await renderPdf(cv));
    for (const framed of [true, false]) {
      cv.certificates = [{ id:'certificate', name:'Formação Avançada', description:'Certificado de teste', pdfDataUrl:`data:application/pdf;base64,${Buffer.from(raw).toString('base64')}`, bytes:raw.length, pageCount:2, hash:'test', framed }];
      const output = await PDFDocument.load(await renderPdf(cv));
      expect(output.getPageCount()).toBe(base.getPageCount() + 2);
      expect((await readCVFromPdf(Buffer.from(await output.save())))?.certificates).toEqual(cv.certificates);
    }
  });
  it('fails an invalid attachment instead of silently dropping it', async () => {
    const cv = sampleCVByLocale('pt');
    cv.certificates = [{ id:'broken', name:'Broken', description:'', pdfDataUrl:'data:application/pdf;base64,YWJj', bytes:3, pageCount:1, hash:'' }];
    await expect(renderPdf(cv)).rejects.toThrow('Invalid certificate');
  });
  it('reopens an exported PDF in a fresh process with no usable installation keys', async () => {
    const cv = normalizeCV(sampleCVByLocale('pt'))!;
    const bytes = await renderPdf(cv);
    const result = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', `
      import { readFileSync } from 'node:fs';
      import { readCVFromPdf } from './pdf/read.ts';
      process.stdout.write(JSON.stringify(await readCVFromPdf(readFileSync(0))));
    `], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), input: bytes,
      env: { ...process.env, SIGN_KEY_DIR: '/unavailable-opencv-keys', PAYLOAD_AES_KEY_B64: 'invalid', SIGN_PRIVATE_KEY_PEM: 'invalid' },
    });
    expect(JSON.parse(result.toString())).toEqual(cv);
  });
  it('stores editable data as JSON that can be changed without a signature', async () => {
    const cv = sampleCVByLocale('pt');
    const pdf = await PDFDocument.create(); pdf.addPage();
    cv.personal.fullName = 'Editado sem chaves';
    await pdf.attach(Buffer.from(JSON.stringify(cv)), 'opencv.json', { mimeType: 'application/json' });
    expect(await readCVFromPdf(Buffer.from(await pdf.save()))).toEqual(normalizeCV(cv));
  });
  it.each(['not JSON', JSON.stringify({ version: 99 }), JSON.stringify({ ...sampleCVByLocale('pt'), template: 'invalid' })])('rejects invalid embedded data', async data => {
    const pdf = await PDFDocument.create(); pdf.addPage();
    await pdf.attach(Buffer.from(data), 'opencv.json');
    expect(await readCVFromPdf(Buffer.from(await pdf.save()))).toBeNull();
  });
  it('returns null for a PDF without editable data', async () => {
    const pdf = await PDFDocument.create(); pdf.addPage();
    expect(await readCVFromPdf(Buffer.from(await pdf.save()))).toBeNull();
  });
  it.each(['cveaver.dat', 'opencv.dat'])('explains how to migrate an old encrypted %s attachment', async name => {
    const pdf = await PDFDocument.create(); pdf.addPage();
    await pdf.attach(Buffer.from('old encrypted bytes'), name);
    await expect(readCVFromPdf(Buffer.from(await pdf.save()))).rejects.toBeInstanceOf(LegacyEncryptedPdfError);
  });
});
