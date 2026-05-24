import { describe, it, expect } from 'vitest';
import { validateCV, isHexColor, safeFilename, redactEmail } from '../security.ts';

const baseCV = { version: 1, template: 'modern', personal: { fullName: 'Zé Castor' } };

describe('validateCV', () => {
  it('accepts a minimal valid CV', () => {
    expect(validateCV(baseCV)).not.toBeNull();
  });

  it('rejects non-objects and wrong version', () => {
    expect(validateCV(null)).toBeNull();
    expect(validateCV('nope')).toBeNull();
    expect(validateCV({ ...baseCV, version: 2 })).toBeNull();
  });

  it('rejects a template not in the allowlist', () => {
    expect(validateCV({ ...baseCV, template: 'evil' })).toBeNull();
  });

  it('rejects a non-hex accentColor but accepts a hex one', () => {
    expect(validateCV({ ...baseCV, accentColor: 'red' })).toBeNull();
    expect(validateCV({ ...baseCV, accentColor: '#5b3a11' })).not.toBeNull();
  });

  it('rejects an unsupported locale but accepts a supported one', () => {
    expect(validateCV({ ...baseCV, locale: 'xx' })).toBeNull();
    expect(validateCV({ ...baseCV, locale: 'en' })).not.toBeNull();
  });

  it('rejects oversized arrays', () => {
    expect(validateCV({ ...baseCV, experience: new Array(51).fill({}) })).toBeNull();
  });
});

describe('isHexColor', () => {
  it('accepts #rrggbb and rejects everything else', () => {
    expect(isHexColor('#aabbcc')).toBe(true);
    expect(isHexColor('#AABBCC')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor(123)).toBe(false);
  });
});

describe('safeFilename', () => {
  it('strips path traversal and unsafe chars', () => {
    const out = safeFilename('../../etc/passwd');
    expect(out).not.toContain('/');
    expect(out).not.toContain('..');
  });

  it('transliterates accents and spaces', () => {
    expect(safeFilename('Zé Castor.pdf')).toBe('Ze-Castor.pdf');
  });

  it('falls back when the result is empty', () => {
    expect(safeFilename('///')).toBe('cv');
  });
});

describe('redactEmail', () => {
  it('keeps first char + domain', () => {
    expect(redactEmail('tomas@example.com')).toBe('t***@example.com');
    expect(redactEmail(null)).toBe('-');
    expect(redactEmail('not-an-email')).toBe('-');
  });
});
