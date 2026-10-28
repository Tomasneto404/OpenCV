import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountStore } from '../accounts/store';
import { createAccountRouter } from '../accounts/router';
import { emptyCV } from '../../client/src/types';

const cleanup: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
export async function serve(app: ReturnType<typeof express>) {
  const server = createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, server };
}
const close = (server: Server) => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
async function setup() {
  const store = new AccountStore(':memory:'); const app = express(); const { origin, server } = await serve(app);
  app.use('/api', createAccountRouter({ store, origin, rateLimits: false }));
  cleanup.push(() => store.db.close(), () => close(server));
  return { store, origin };
}
function client(origin: string) {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
      const response = await fetch(origin + '/api' + path, { method, headers: { Cookie: cookie, Origin: origin, 'X-OpenCV-Request': '1', 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
      const set = response.headers.getSetCookie().find(value => value.startsWith('opencv_session='));
      if (set) cookie = set.split(';')[0];
      return response;
    },
  };
}
const registration = (email = 'ana@example.com') => ({ name: 'Ana', email, password: 'correct horse battery staple' });
const document = { title: 'Design CV', cv: emptyCV() };

describe('optional accounts and private CV ownership', () => {
  it('registers, persists a hashed session, signs out and signs in without exposing credentials', async () => {
    const { origin, store } = await setup(); const browser = client(origin);
    expect(await (await browser.request('/auth/session')).json()).toEqual({ user: null, sso: null, registrationEnabled: true });
    const response = await browser.request('/auth/register', 'POST', registration());
    expect(response.status).toBe(201);
    const { user } = await response.json(); expect(user.name).toBe('Ana'); expect(user.password_hash).toBeUndefined();
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/); expect(response.headers.get('set-cookie')).toMatch(/SameSite=Lax/i);
    const stored = store.localUser('ana@example.com')!;
    expect(stored.password_hash).not.toContain(registration().password);
    expect(store.db.prepare('SELECT token_hash FROM sessions').get()!.token_hash).not.toBe(browser.cookie.split('=')[1]);
    const previous = browser.cookie;
    expect((await browser.request('/auth/logout', 'POST')).status).toBe(204);
    expect((await browser.request('/cvs', 'GET', undefined, { Cookie: previous })).status).toBe(401);
    expect((await browser.request('/auth/login', 'POST', { email: 'ANA@example.com', password: registration().password })).status).toBe(200);
    expect(browser.cookie).not.toBe(previous);
  });
  it('rejects weak passwords, duplicate local email, wrong credentials and cross-site mutations', async () => {
    const { origin } = await setup(); const browser = client(origin);
    expect((await browser.request('/auth/register', 'POST', { ...registration(), password: 'short' })).status).toBe(400);
    expect((await browser.request('/auth/register', 'POST', registration(), { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await browser.request('/auth/register', 'POST', registration(), { 'X-OpenCV-Request': '' })).status).toBe(403);
    await browser.request('/auth/register', 'POST', registration());
    expect((await browser.request('/auth/register', 'POST', registration())).status).toBe(409);
    expect((await browser.request('/auth/login', 'POST', { email: registration().email, password: 'wrong password' })).status).toBe(401);
  });
  it('isolates all CV operations by owner and detects stale writes and deletes', async () => {
    const { origin } = await setup(); const a = client(origin); const b = client(origin); const guest = client(origin);
    await a.request('/auth/register', 'POST', registration()); await b.request('/auth/register', 'POST', registration('other@example.com'));
    expect((await guest.request('/cvs')).status).toBe(401);
    const created = await (await a.request('/cvs', 'POST', document)).json();
    expect(created.revision).toBe(1);
    expect((await (await b.request('/cvs')).json()).cvs).toEqual([]);
    for (const method of ['GET', 'PUT', 'DELETE']) expect((await b.request(`/cvs/${created.id}`, method, method === 'GET' ? undefined : { ...document, revision: 1 })).status).toBe(404);
    expect((await a.request(`/cvs/${created.id}`, 'PUT', { ...document, title: 'Updated', revision: 1 })).status).toBe(200);
    expect((await a.request(`/cvs/${created.id}`, 'PUT', { ...document, revision: 1 })).status).toBe(409);
    expect((await a.request(`/cvs/${created.id}`, 'DELETE', { revision: 1 })).status).toBe(409);
    expect((await a.request('/cvs', 'POST', document, { 'X-OpenCV-User': 'previous-account' })).status).toBe(401);
    expect((await a.request(`/cvs/${created.id}`, 'DELETE', { revision: 2 })).status).toBe(204);
    expect((await a.request(`/cvs/${created.id}`)).status).toBe(404);
  });
  it('invalidates expired sessions and other sessions after a password change', async () => {
    const { origin, store } = await setup(); const a = client(origin); const b = client(origin);
    await a.request('/auth/register', 'POST', registration()); await b.request('/auth/login', 'POST', registration());
    expect((await a.request('/auth/password', 'POST', { currentPassword: registration().password, password: 'a different long password' })).status).toBe(204);
    expect((await b.request('/cvs')).status).toBe(401); expect((await a.request('/cvs')).status).toBe(200);
    store.db.prepare('UPDATE sessions SET expires_at = 0').run();
    expect((await a.request('/cvs')).status).toBe(401);
  });
  it('keeps saved CVs after reopening the database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'opencv-db-test-')); cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, 'app.sqlite'); const first = new AccountStore(path);
    const user = first.createUser('Ana', 'ana@example.com', 'hashed'); const saved = first.create(user.id, document.title, document.cv); first.db.close();
    const second = new AccountStore(path); cleanup.push(() => second.db.close());
    expect(second.get(user.id, saved.id)).toEqual(saved);
  });
});
