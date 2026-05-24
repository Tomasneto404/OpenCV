import { describe, it, expect, beforeAll } from 'vitest';

// Pin a fixed AES key BEFORE importing crypto.js (its KEY is resolved at import
// time), so the round-trip is deterministic and writes no key file to disk.
let encryptPayload: (obj: unknown) => Buffer;
let decryptPayload: (buf: Buffer) => unknown;

beforeAll(async () => {
  process.env.PAYLOAD_AES_KEY_B64 = Buffer.alloc(32, 7).toString('base64');
  const mod = await import('../crypto.js');
  encryptPayload = mod.encryptPayload;
  decryptPayload = mod.decryptPayload;
});

describe('encryptPayload / decryptPayload', () => {
  it('round-trips an object back to its original value', () => {
    const payload = { cv: { version: 1, template: 'modern' }, meta: { editCount: 3 } };
    const blob = encryptPayload(payload);
    expect(Buffer.isBuffer(blob)).toBe(true);
    expect(decryptPayload(blob)).toEqual(payload);
  });

  it('produces a versioned, non-plaintext blob', () => {
    const blob = encryptPayload({ secret: 'top' });
    expect(blob[0]).toBe(1); // version byte
    expect(blob.toString('utf8')).not.toContain('top');
  });

  it('throws when the ciphertext is tampered with', () => {
    const blob = encryptPayload({ a: 1 });
    blob[blob.length - 1] ^= 0xff; // corrupt the auth tag
    expect(() => decryptPayload(blob)).toThrow();
  });
});
