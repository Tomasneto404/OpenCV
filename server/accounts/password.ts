import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored?: string | null) {
  const parts = stored?.split(':');
  // Perform the same expensive work for unknown accounts.
  const salt = parts?.[1] || '00000000000000000000000000000000';
  const actual = await derive(password, salt);
  const expected = Buffer.from(parts?.[2] || '00'.repeat(64), 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected) && !!stored;
}
