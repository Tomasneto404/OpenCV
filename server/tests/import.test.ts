import { describe, expect, it } from 'vitest';
import { normalizeCV } from '../../shared/normalizeCV';
const base = { version:1, template:'studio', personal:{ fullName:'Ana' } };
describe('import validation', () => {
  it('fills absent optional fields before the UI or PDF uses them', () => {
    const cv = normalizeCV(base)!;
    expect(cv.personal.email).toBe(''); expect(cv.summary).toBe(''); expect(cv.experience).toEqual([]);
  });
  it.each([null, 'bad', { role: 42 }, { description: {} }])('rejects malformed collection items: %j', item => {
    expect(normalizeCV({ ...base, experience:[item] })).toBeNull();
  });
  it('rejects external photo URLs', () => {
    expect(normalizeCV({ ...base, personal:{ fullName:'Ana', photoDataUrl:'https://example.com/p.png' } })).toBeNull();
  });
  it('does not trust a forged certificate byte count', () => {
    const value = { ...base, certificates:[{ name:'Cert', bytes:0, pdfDataUrl:`data:application/pdf;base64,${'A'.repeat(14*1024*1024)}` }] };
    expect(normalizeCV(value)).toBeNull();
  });
  it('rejects duplicate IDs to keep editing predictable', () => {
    expect(normalizeCV({ ...base, experience:[{ id:'same' }, { id:'same' }] })).toBeNull();
  });
});
