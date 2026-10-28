import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountStore } from '../accounts/store';
import { createAccountRouter } from '../accounts/router';
import { emptyCV } from '../../client/src/types';

const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function setup() {
  const store = new AccountStore(':memory:'); const app = express(); const server = createServer(app);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  app.use('/api', createAccountRouter({ store, origin, rateLimits: false }));
  app.post('/api/pdf', (req, res) => req.query.fail ? res.status(500).json({ error: 'render_failed' }) : res.type('pdf').send('pdf fixture'));
  cleanup.push(() => store.db.close(), () => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  return { store, origin };
}
function client(origin: string) {
  const cookies = new Map<string, string>();
  return {
    request: async (path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => {
      const response = await fetch(origin + '/api' + path, { method, headers: { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), Origin: origin, 'X-OpenCV-Request': '1', 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      for (const header of response.headers.getSetCookie()) { const [key, value] = header.split(';')[0].split('='); cookies.set(key, value); }
      return response;
    },
  };
}
const registration = (email: string) => ({ name: email.split('@')[0], email, password: 'correct horse battery staple', role: 'admin' });
async function invite(admin: ReturnType<typeof client>, email: string) {
  const response = await admin.request('/admin/invitations', 'POST', { email }); expect(response.status).toBe(201);
  const data = await response.json(); return { ...data, token: new URLSearchParams(new URL(data.url).hash.slice(1)).get('invite') };
}

describe('administration and registration policy', () => {
  it('assigns exactly one first administrator during concurrent registration and ignores requested roles', async () => {
    const { origin, store } = await setup();
    const responses = await Promise.all([client(origin).request('/auth/register', 'POST', registration('a@example.com')), client(origin).request('/auth/register', 'POST', registration('b@example.com'))]);
    expect(responses.map(response => response.status)).toEqual([201, 201]);
    const users = await Promise.all(responses.map(response => response.json()));
    expect(users.filter(({ user }) => user.role === 'admin')).toHaveLength(1);
    expect(store.db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'").get()!.total).toBe(1);
  });
  it('migrates the oldest existing account only once and preserves CVs and policy on restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'opencv-admin-')); cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, 'app.sqlite'); const legacy = new DatabaseSync(path);
    legacy.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, password_hash TEXT, created_at TEXT NOT NULL);
      INSERT INTO users VALUES ('new', 'New', 'new@example.com', 'hash', '2025-02-01');
      INSERT INTO users VALUES ('old', 'Old', 'old@example.com', 'hash', '2025-01-01');`); legacy.close();
    const first = new AccountStore(path);
    expect(first.localUser('old@example.com')!.role).toBe('admin'); expect(first.localUser('new@example.com')!.role).toBe('user');
    const saved = first.create('old', 'Legacy CV', emptyCV()); first.db.prepare("UPDATE settings SET value = 'false' WHERE key = 'registration_enabled'").run(); first.db.close();
    const second = new AccountStore(path); cleanup.push(() => second.db.close());
    expect(second.get('old', saved.id)).toEqual(saved); expect(second.registrationEnabled()).toBe(false);
    expect(second.db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'").get()!.total).toBe(1);
  });
  it('protects every admin route from guests, ordinary users and cross-origin mutations', async () => {
    const { origin } = await setup(); const admin = client(origin); const member = client(origin); const guest = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com')); await member.request('/auth/register', 'POST', registration('member@example.com'));
    for (const browser of [guest, member]) {
      for (const [path, method, body] of [['/admin/overview', 'GET'], ['/admin/users', 'GET'], ['/admin/invitations', 'GET'], ['/admin/settings', 'PUT', { registrationEnabled: false }], ['/admin/invitations', 'POST', { email: 'test@example.com' }], ['/admin/invitations/id', 'DELETE'], ['/admin/integrations', 'GET'], ['/admin/integrations/oidc', 'PUT', {}], ['/admin/integrations/telegram', 'PUT', {}], ['/admin/integrations/telegram/test', 'POST'], ['/admin/local-login', 'POST', {}]] as const) {
        expect((await browser.request(path, method, body)).status).toBe(browser === guest ? 401 : 403);
      }
    }
    expect((await admin.request('/admin/settings', 'PUT', { registrationEnabled: false }, { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await admin.request('/admin/settings', 'PUT', { registrationEnabled: false }, { 'X-OpenCV-Request': '' })).status).toBe(403);
    expect((await admin.request('/admin/settings', 'PUT', { registrationEnabled: 'false' })).status).toBe(400);
  });
  it('configures SSO from the admin API immediately and never returns the saved secret', async () => {
    const { origin } = await setup(); const admin = client(origin); const guest = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com'));
    const settings = { enabled: true, issuer: 'https://id.example.com', clientId: 'opencv', clientSecret: 'synthetic-config-secret', label: 'Company SSO' };
    const response = await admin.request('/admin/integrations/oidc', 'PUT', settings);
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ hasSecret: true, clientSecret: '' });
    expect((await (await guest.request('/auth/session')).json()).sso).toEqual({ label: 'Company SSO' });
    expect(JSON.stringify(await (await admin.request('/admin/integrations')).json())).not.toContain(settings.clientSecret);
    expect((await admin.request('/admin/integrations/oidc', 'PUT', settings, { Origin: 'https://evil.example' })).status).toBe(403);
    await admin.request('/admin/integrations/oidc', 'PUT', { ...settings, enabled: false, clientSecret: '' });
    expect((await (await guest.request('/auth/session')).json()).sso).toBeNull();
  });
  it('closes and reopens registrations while keeping login and public export available', async () => {
    const { origin } = await setup(); const admin = client(origin); const guest = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com'));
    expect((await admin.request('/admin/settings', 'PUT', { registrationEnabled: false })).status).toBe(200);
    expect((await (await guest.request('/auth/session')).json()).registrationEnabled).toBe(false);
    expect((await guest.request('/auth/register', 'POST', registration('blocked@example.com'))).status).toBe(403);
    expect((await guest.request('/pdf', 'POST')).status).toBe(200);
    expect((await guest.request('/auth/login', 'POST', registration('admin@example.com'))).status).toBe(200);
    await admin.request('/admin/settings', 'PUT', { registrationEnabled: true });
    expect((await guest.request('/auth/register', 'POST', registration('allowed@example.com'))).status).toBe(201);
  });
  it('accepts a private email-bound invitation once when registration is closed, without granting admin', async () => {
    const { origin, store } = await setup(); const admin = client(origin); const guest = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com'));
    await admin.request('/admin/settings', 'PUT', { registrationEnabled: false });
    const invitation = await invite(admin, 'INVITED@example.com');
    expect(store.db.prepare('SELECT token_hash FROM invitations').get()!.token_hash).not.toBe(invitation.token);
    expect(await (await guest.request('/auth/invitation', 'POST', { invite: invitation.token })).json()).toEqual({ email: 'invited@example.com' });
    expect((await guest.request('/auth/register', 'POST', { ...registration('wrong@example.com'), invite: invitation.token })).status).toBe(403);
    const response = await guest.request('/auth/register', 'POST', { ...registration('invited@example.com'), invite: invitation.token });
    expect(response.status).toBe(201); expect((await response.json()).user.role).toBe('user');
    expect((await guest.request('/auth/invitation', 'POST', { invite: invitation.token })).status).toBe(400);
    expect((await guest.request('/admin/users')).status).toBe(403);
    const list = await (await admin.request('/admin/invitations')).json();
    expect(list.invitations[0].usedAt).toBeTruthy(); expect(JSON.stringify(list)).not.toContain(invitation.token); expect(JSON.stringify(list)).not.toContain('token_hash');
  });
  it('rejects expired, revoked and forged invitations and allows only one concurrent redemption', async () => {
    const { origin, store } = await setup(); const admin = client(origin); const guest = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com'));
    const expired = await invite(admin, 'expired@example.com'); store.db.prepare('UPDATE invitations SET expires_at = 0 WHERE id = ?').run(expired.id);
    const revoked = await invite(admin, 'revoked@example.com'); expect((await admin.request(`/admin/invitations/${revoked.id}`, 'DELETE')).status).toBe(204);
    for (const invitation of [expired, revoked, { token: 'forged' }]) expect((await guest.request('/auth/register', 'POST', { ...registration('expired@example.com'), invite: invitation.token })).status).toBeGreaterThanOrEqual(400);
    const once = await invite(admin, 'once@example.com');
    const responses = await Promise.all([guest, client(origin)].map(browser => browser.request('/auth/register', 'POST', { ...registration('once@example.com'), invite: once.token })));
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
  });
  it('lists users with search and pagination, without passwords, sessions or CV contents', async () => {
    const { origin, store } = await setup(); const admin = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com'));
    for (let i = 0; i < 27; i++) store.createUser(`Person ${i}`, `person${i}@example.com`, 'private-password-hash');
    const user = store.localUser('person0@example.com')!; const cv = emptyCV(); cv.personal.fullName = 'private CV contents'; store.create(user.id, 'private title', cv);
    const result = await (await admin.request('/admin/users')).json(); expect(result.total).toBe(28); expect(result.users).toHaveLength(25);
    expect((await (await admin.request('/admin/users?page=2')).json()).users).toHaveLength(3);
    const search = await (await admin.request('/admin/users?q=person0%40example.com')).json(); expect(search.users[0].cvCount).toBe(1);
    for (const secret of ['private-password-hash', 'private CV contents', 'private title', 'password_hash']) expect(JSON.stringify(search)).not.toContain(secret);
    expect((await (await admin.request('/admin/users?q=%25')).json()).total).toBe(0);
  });
});

describe('aggregate analytics', () => {
  it('counts visits with a sliding session, page views, successful PDFs and active accounts', async () => {
    const { origin, store } = await setup(); const admin = client(origin); const guest = client(origin);
    await admin.request('/auth/register', 'POST', registration('admin@example.com'));
    await guest.request('/analytics/page', 'POST'); await guest.request('/analytics/page', 'POST');
    await admin.request('/analytics/page', 'POST'); await admin.request('/pdf', 'POST'); await guest.request('/pdf', 'POST'); await guest.request('/pdf?fail=1', 'POST');
    await admin.request('/cvs', 'POST', { title: 'CV', cv: emptyCV() });
    let overview = await (await admin.request('/admin/overview')).json();
    expect(overview.totals).toMatchObject({ users: 1, localUsers: 1, ssoUsers: 0, active24h: 1, active30d: 1, savedCVs: 1, visits: 2, pageViews: 3, pdfExports: 2, guestExports: 1, memberExports: 1 });
    expect(overview.series).toHaveLength(30); expect(overview.series.at(-1)).toMatchObject({ visits: 2, active_users: 1, registrations: 1, cv_created: 1 });
    store.db.prepare('UPDATE visits SET expires_at = 0').run(); await guest.request('/analytics/page', 'POST');
    overview = await (await admin.request('/admin/overview')).json(); expect(overview.totals.visits).toBe(3); expect(overview.totals.pageViews).toBe(4);
  });
  it('honors privacy signals, rejects cross-site analytics and does not store raw browsing data', async () => {
    const { origin, store } = await setup(); const browser = client(origin);
    expect((await browser.request('/analytics/page', 'POST', {}, { DNT: '1' })).headers.getSetCookie()).toEqual([]);
    expect((await browser.request('/analytics/page', 'POST', {}, { 'Sec-GPC': '1' })).status).toBe(204);
    expect((await browser.request('/analytics/page', 'POST', {}, { Origin: 'https://evil.example' })).status).toBe(403);
    expect(store.db.prepare('SELECT * FROM daily_metrics').all()).toEqual([]);
    await browser.request('/analytics/page', 'POST', { path: '/private/cv/secret', email: 'secret@example.com' });
    expect(JSON.stringify(store.db.prepare('SELECT * FROM daily_metrics').all())).not.toContain('secret');
    expect(store.db.prepare('PRAGMA table_info(visits)').all().map(row => row.name)).toEqual(['token_hash', 'expires_at']);
  });
});
