import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { generateKeyPairSync, sign, randomUUID, createHash } from 'node:crypto';
import { AccountStore } from '../accounts/store';
import { createAccountRouter } from '../accounts/router';

const closers: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const close of closers.splice(0).reverse()) await close(); });
async function listen(app: ReturnType<typeof express>) {
  const server = createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  closers.push(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function fixture(mode = '') {
  const provider = express(); const issuer = (await listen(provider)) + '/';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig', alg: 'RS256' };
  const codes = new Map<string, { nonce: string; challenge: string; redirect: string }>();
  provider.get('/.well-known/openid-configuration', (_req, res) => res.json({
    issuer, authorization_endpoint: issuer + 'authorize', token_endpoint: issuer + 'token', jwks_uri: issuer + 'jwks',
    response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_post'], code_challenge_methods_supported: ['S256'],
  }));
  provider.get('/jwks', (_req, res) => res.json({ keys: [jwk] }));
  provider.get('/authorize', (req, res) => {
    const code = randomUUID();
    codes.set(code, { nonce: String(req.query.nonce), challenge: String(req.query.code_challenge), redirect: String(req.query.redirect_uri) });
    const redirect = new URL(String(req.query.redirect_uri)); redirect.searchParams.set('code', code); redirect.searchParams.set('state', String(req.query.state)); res.redirect(redirect.href);
  });
  provider.post('/token', express.urlencoded({ extended: false }), (req, res) => {
    const data = codes.get(req.body.code); codes.delete(req.body.code);
    if (!data || req.body.client_id !== 'test-client' || req.body.client_secret !== 'test-secret' || req.body.redirect_uri !== data.redirect || createHash('sha256').update(req.body.code_verifier || '').digest('base64url') !== data.challenge) return res.status(400).json({ error: 'invalid_grant' });
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ iss: mode === 'issuer' ? 'https://wrong.example' : issuer, aud: mode === 'audience' ? 'another-client' : 'test-client', sub: 'same-stable-subject', iat: now, exp: mode === 'expiry' ? now - 600 : now + 300, nonce: mode === 'nonce' ? 'wrong' : data.nonce, name: 'SSO User', email: 'ana@example.com', email_verified: true })).toString('base64url');
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url');
    res.json({ token_type: 'Bearer', access_token: 'test-access', expires_in: 300, id_token: `${header}.${body}.${mode === 'signature' ? Buffer.alloc(256).toString('base64url') : signature}` });
  });
  const store = new AccountStore(':memory:'); closers.push(() => store.db.close());
  const app = express(); const origin = await listen(app);
  app.use('/api', createAccountRouter({ store, origin, oidc: { issuer, clientId: 'test-client', clientSecret: 'test-secret', label: 'Test SSO', allowHttp: true }, rateLimits: false }));
  let cookie = '';
  const begin = async () => {
    const start = await fetch(origin + '/api/auth/sso', { redirect: 'manual' });
    cookie = start.headers.getSetCookie()[0].split(';')[0];
    const auth = await fetch(start.headers.get('location')!, { redirect: 'manual' });
    return auth.headers.get('location')!;
  };
  const finish = (url: string) => fetch(url, { headers: { Cookie: cookie }, redirect: 'manual' });
  return { store, origin, begin, finish };
}
describe('OpenID Connect authorization code flow', () => {
  it('validates a signed OIDC response, uses stable identity and never merges local accounts by email', async () => {
    const f = await fixture(); const local = f.store.createUser('Local Ana', 'ana@example.com', 'local-hash');
    const callback = await f.begin(); const response = await f.finish(callback);
    expect(response.headers.get('location')).toBe(f.origin + '/account');
    const sessionCookie = response.headers.getSetCookie().find(c => c.startsWith('opencv_session='))!.split(';')[0];
    const session = await (await fetch(f.origin + '/api/auth/session', { headers: { Cookie: sessionCookie } })).json();
    expect(session.user.name).toBe('SSO User'); expect(session.user.id).not.toBe(local.id);
    expect(session.user.local).toBe(false);
    const second = await f.finish(await f.begin()); expect(second.headers.get('location')).toBe(f.origin + '/account');
    expect(f.store.db.prepare('SELECT COUNT(*) AS total FROM users').get()!.total).toBe(2);
    expect((await f.finish(callback)).headers.get('location')).toContain('error=sso_failed');
  });
  it.each(['nonce', 'issuer', 'audience', 'signature', 'expiry'])('rejects an invalid %s claim or signature without creating an account', async mode => {
    const f = await fixture(mode); const response = await f.finish(await f.begin());
    expect(response.headers.get('location')).toContain('error=sso_failed');
    expect(f.store.db.prepare('SELECT COUNT(*) AS total FROM users').get()!.total).toBe(0);
  });
  it('rejects state tampering and expired or missing browser correlation', async () => {
    const f = await fixture(); const callback = new URL(await f.begin()); callback.searchParams.set('state', 'forged');
    expect((await f.finish(callback.href)).headers.get('location')).toContain('error=sso_failed');
    const expired = await f.begin(); f.store.db.prepare('UPDATE oidc_attempts SET expires_at = 0').run();
    expect((await f.finish(expired)).headers.get('location')).toContain('error=sso_failed');
    const missing = await f.begin();
    expect((await fetch(missing, { redirect: 'manual' })).headers.get('location')).toContain('error=sso_failed');
  });
});
