import express from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AccountStore } from './store';
import { ConfigurationError, type Integrations } from './integrations';
import { notificationChannels, type NotificationChannel } from '../../shared/integrations';
import { hashPassword } from './password';

export function createAdminRouter(store: AccountStore, origin: string, integrations: Integrations) {
  const router = express.Router();
  router.use((_req, res, next) => {
    if (res.locals.user.role !== 'admin') return res.status(403).json({ error: 'admin_required' });
    next();
  });
  router.get('/integrations', (_req, res) => res.json(integrations.publicConfig()));
  router.put('/integrations/oidc', express.json({ limit: '16kb' }), (req, res, next) => {
    try { res.json(integrations.saveOIDC(req.body || {})); }
    catch (error) { if (error instanceof ConfigurationError) res.status(400).json({ error: error.message }); else next(error); }
  });
  router.put('/integrations/:channel', express.json({ limit: '16kb' }), (req, res, next) => {
    if (!notificationChannels.includes(req.params.channel as NotificationChannel)) return res.status(404).json({ error: 'invalid_integration' });
    try { res.json(integrations.saveChannel(req.params.channel as NotificationChannel, req.body || {})); }
    catch (error) { if (error instanceof ConfigurationError) res.status(400).json({ error: error.message }); else next(error); }
  });
  router.post('/integrations/:channel/test', async (req, res, next) => {
    if (!notificationChannels.includes(req.params.channel as NotificationChannel)) return res.status(404).json({ error: 'invalid_integration' });
    try { await integrations.send(req.params.channel as NotificationChannel, 'OpenCV: test notification from the administration panel.'); res.json({ ok: true }); }
    catch (error) { if (error instanceof ConfigurationError) res.status(502).json({ error: error.message }); else next(error); }
  });
  router.post('/local-login', express.json({ limit: '2kb' }), async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (res.locals.user.password_hash || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'invalid_registration' });
      const hash = await hashPassword(password);
      if (store.localUser(email.trim().toLowerCase())) return res.status(409).json({ error: 'email_taken' });
      const result = store.db.prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ? AND password_hash IS NULL').run(email.trim().toLowerCase(), hash, res.locals.user.id);
      if (!result.changes) return res.status(409).json({ error: 'invalid_registration' });
      res.status(204).end();
    } catch (error) { next(error); }
  });
  router.get('/overview', (_req, res) => {
    const count = (sql: string, ...params: string[]) => Number(store.db.prepare(sql).get(...params)!.total);
    const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
    const totals = Object.fromEntries(store.db.prepare('SELECT metric, SUM(count) AS total FROM daily_metrics GROUP BY metric').all().map(row => [row.metric, Number(row.total)]));
    const days = Array.from({ length: 30 }, (_, index) => since(29 - index).slice(0, 10));
    const series = new Map(days.map(day => [day, { day, visits: 0, page_views: 0, guest_exports: 0, member_exports: 0, cv_created: 0, active_users: 0, registrations: 0 }]));
    for (const row of store.db.prepare('SELECT * FROM daily_metrics WHERE day >= ?').all(days[0])) {
      const point = series.get(String(row.day));
      const metric = String(row.metric);
      if (point && metric in point && metric !== 'day') point[metric as 'visits'] = Number(row.count);
    }
    for (const row of store.db.prepare('SELECT day, COUNT(*) AS total FROM daily_users WHERE day >= ? GROUP BY day').all(days[0])) {
      const point = series.get(String(row.day)); if (point) point.active_users = Number(row.total);
    }
    for (const row of store.db.prepare('SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total FROM users WHERE created_at >= ? GROUP BY day').all(days[0])) {
      const point = series.get(String(row.day)); if (point) point.registrations = Number(row.total);
    }
    res.json({
      registrationEnabled: store.registrationEnabled(),
      since: store.db.prepare("SELECT value FROM settings WHERE key = 'analytics_since'").get()!.value,
      totals: {
        users: count('SELECT COUNT(*) AS total FROM users'),
        localUsers: count('SELECT COUNT(*) AS total FROM users WHERE password_hash IS NOT NULL'),
        ssoUsers: count('SELECT COUNT(*) AS total FROM users WHERE password_hash IS NULL'),
        active24h: count('SELECT COUNT(*) AS total FROM users WHERE last_seen_at >= ?', since(1)),
        active30d: count('SELECT COUNT(*) AS total FROM users WHERE last_seen_at >= ?', since(30)),
        savedCVs: count('SELECT COUNT(*) AS total FROM cvs'),
        visits: totals.visits || 0, pageViews: totals.page_views || 0,
        pdfExports: (totals.guest_exports || 0) + (totals.member_exports || 0),
        guestExports: totals.guest_exports || 0, memberExports: totals.member_exports || 0,
      }, series: [...series.values()],
    });
  });
  router.put('/settings', express.json({ limit: '1kb' }), (req, res) => {
    if (typeof req.body?.registrationEnabled !== 'boolean') return res.status(400).json({ error: 'invalid_settings' });
    store.db.prepare("UPDATE settings SET value = ? WHERE key = 'registration_enabled'").run(String(req.body.registrationEnabled));
    res.json({ registrationEnabled: store.registrationEnabled() });
  });
  router.get('/users', (req, res) => {
    const page = Math.max(1, Math.min(1_000_000, Number(req.query.page) || 1)) | 0;
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const where = "WHERE name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'";
    const total = Number(store.db.prepare(`SELECT COUNT(*) AS total FROM users ${where}`).get(like, like)!.total);
    const users = store.db.prepare(`SELECT id, name, email, role, created_at AS createdAt, last_seen_at AS lastSeenAt,
      CASE WHEN password_hash IS NULL THEN 'sso' ELSE 'local' END AS method,
      (SELECT COUNT(*) FROM cvs WHERE user_id = users.id) AS cvCount
      FROM users ${where} ORDER BY created_at DESC, id LIMIT 25 OFFSET ?`).all(like, like, (page - 1) * 25);
    res.json({ users, total, page, pageSize: 25 });
  });
  router.get('/invitations', (_req, res) => res.json({ invitations: store.db.prepare(`SELECT id, email, created_at AS createdAt, expires_at AS expiresAt, used_at AS usedAt, revoked_at AS revokedAt FROM invitations ORDER BY created_at DESC LIMIT 50`).all() }));
  router.post('/invitations', express.json({ limit: '2kb' }), (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
    if (store.localUser(email)) return res.status(409).json({ error: 'email_taken' });
    const secret = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(secret).digest('hex');
    const id = randomUUID(); const expiresAt = Date.now() + 7 * 86_400_000;
    store.db.prepare('INSERT INTO invitations (id, token_hash, email, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, hash, email, res.locals.user.id, new Date().toISOString(), expiresAt);
    // A fragment keeps the invitation secret out of server access logs and referrers.
    const url = new URL('/login', origin); url.hash = `invite=${secret}`;
    res.status(201).json({ id, url: url.href, expiresAt });
  });
  router.delete('/invitations/:id', (req, res) => {
    const result = store.db.prepare('UPDATE invitations SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL').run(new Date().toISOString(), String(req.params.id));
    if (!result.changes) return res.status(404).json({ error: 'invitation_unavailable' });
    res.status(204).end();
  });
  return router;
}
