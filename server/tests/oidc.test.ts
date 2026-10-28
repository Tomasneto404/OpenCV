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
    const body = Buffer.from(JSON.stringify({ iss: mode === 'issuer' ? 'https://wrong.example' : issuer, aud: mode === 'audience' ? 'another-client' : 'test-client', sub: 'same-stable-subject', iat: now, exp: mode === 'expiry' ? now - 600 : now + 300, nonce: mode === 'nonce' ? 'wrong' : data.nonce, name: 'SSO User', email: 'ana@example.com', email_verified: mode !== 'unverified' })).toString('base64url');
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url');
    res.json({ token_type: 'Bearer', access_token: 'test-access', expires_in: 300, id_token: `${header}.${body}.${mode === 'signature' ? Buffer.alloc(256).toString('base64url') : signature}` });
  });
  const store = new AccountStore(':memory:'); closers.push(() => store.db.close());
  const app = express(); const origin = await listen(app);
  app.use('/api', createAccountRouter({ store, origin, oidc: { issuer, clientId: 'test-client', clientSecret: 'test-secret', label: 'Test SSO', allowHttp: true }, rateLimits: false }));
  let cookie = '';
  const begin = async (invite?: string) => {
    const start = await fetch(origin + '/api/auth/sso', { redirect: 'manual', ...(invite ? { method: 'POST', headers: { 'X-OpenCV-Request': '1', 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ invite }) } : {}) });
    cookie = start.headers.getSetCookie()[0].split(';')[0];
    const auth = await fetch(invite ? (await start.json()).url : start.headers.get('location')!, { redirect: 'manual' });
    return auth.headers.get('location')!;
  };
  const finish = (url: string) => fetch(url, { headers: { Cookie: cookie }, redirect: 'manual' });
  return { store, origin, issuer, begin, finish };
}
describe('OpenID Connect authorization code flow', () => {
  it('uses provider settings saved by the admin API and rejects flows invalidated by a settings change', async () => {
    const f = await fixture(); const admin = f.store.createUser('Admin', 'admin@example.com', 'hash');
    const cookie = 'a'.repeat(43); f.store.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(createHash('sha256').update(cookie).digest('hex'), admin.id, Date.now() + 60_000);
    const headers = { Cookie: `opencv_session=${cookie}`, Origin: f.origin, 'X-OpenCV-Request': '1', 'Content-Type': 'application/json' };
    const settings = { enabled: true, issuer: f.issuer, clientId: 'test-client', clientSecret: 'test-secret', label: 'Configured in admin' };
    const save = (body: unknown) => fetch(f.origin + '/api/admin/integrations/oidc', { method: 'PUT', headers, body: JSON.stringify(body) });
    expect((await save(settings)).status).toBe(200);
    expect((await f.finish(await f.begin())).headers.get('location')).toBe(f.origin + '/account');
    const inFlight = await f.begin();
    expect((await save({ ...settings, clientSecret: '', enabled: false })).status).toBe(200);
    expect((await f.finish(inFlight)).headers.get('location')).toContain('error=sso_failed');
    expect((await fetch(f.origin + '/api/auth/sso', { redirect: 'manual' })).status).toBe(404);
  });
  it('lets an SSO administrator enable local login before changing the provider', async () => {
    const f = await fixture(); const response = await f.finish(await f.begin());
    const cookie = response.headers.getSetCookie().find(c => c.startsWith('opencv_session='))!.split(';')[0];
    const headers = { Cookie: cookie, Origin: f.origin, 'X-OpenCV-Request': '1', 'Content-Type': 'application/json' };
    const credentials = { email: 'admin-local@example.com', password: 'local fallback long password' };
    expect((await fetch(f.origin + '/api/admin/local-login', { method: 'POST', headers, body: JSON.stringify(credentials) })).status).toBe(204);
    const login = await fetch(f.origin + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify(credentials) });
    expect(login.status).toBe(200); expect((await login.json()).user).toMatchObject({ role: 'admin', local: true });
    expect(f.store.db.prepare('SELECT COUNT(*) AS total FROM users').get()!.total).toBe(1);
  });
  it('makes the first SSO account admin and still allows existing SSO accounts when registrations close', async () => {
    const f = await fixture();
    expect((await f.finish(await f.begin())).headers.get('location')).toBe(f.origin + '/account');
    expect(f.store.db.prepare('SELECT role FROM users').get()!.role).toBe('admin');
    f.store.db.prepare("UPDATE settings SET value = 'false' WHERE key = 'registration_enabled'").run();
    expect((await f.finish(await f.begin())).headers.get('location')).toBe(f.origin + '/account');
  });
  it('enforces closed registration at the SSO callback, including a login started before closure', async () => {
    const f = await fixture(); f.store.createUser('Admin', 'admin@example.com', 'hash');
    const callback = await f.begin();
    f.store.db.prepare("UPDATE settings SET value = 'false' WHERE key = 'registration_enabled'").run();
    expect((await f.finish(callback)).headers.get('location')).toContain('error=registration_closed');
    expect(f.store.db.prepare('SELECT COUNT(*) AS total FROM users').get()!.total).toBe(1);
  });
  it.each(['verified', 'unverified', 'revoked'])('uses invitations for SSO only with a verified matching email and a live invitation (%s)', async mode => {
    const f = await fixture(mode); const admin = f.store.createUser('Admin', 'admin@example.com', 'hash');
    f.store.db.prepare("UPDATE settings SET value = 'false' WHERE key = 'registration_enabled'").run();
    const secret = Buffer.alloc(32, 7).toString('base64url'); const hash = createHash('sha256').update(secret).digest('hex');
    f.store.db.prepare('INSERT INTO invitations VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)').run(randomUUID(), hash, 'ana@example.com', admin.id, new Date().toISOString(), Date.now() + 60_000);
    const callback = await f.begin(secret);
    if (mode === 'revoked') f.store.db.prepare('UPDATE invitations SET revoked_at = ?').run(new Date().toISOString());
    const response = await f.finish(callback);
    expect(response.headers.get('location')).toBe(f.origin + (mode === 'verified' ? '/account' : '/login?error=invalid_invitation'));
    expect(f.store.db.prepare('SELECT used_at FROM invitations').get()!.used_at !== null).toBe(mode === 'verified');
    expect(f.store.db.prepare('SELECT COUNT(*) AS total FROM users').get()!.total).toBe(mode === 'verified' ? 2 : 1);
  });
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
